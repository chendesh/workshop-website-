import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function CampForm({ camp, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    location: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    durationDays: 1,
    status: 'Upcoming',
    notes: '',
    totalWorkAmount: 0
  });
  
  const [workersList, setWorkersList] = useState([]);
  const [assignedWorkers, setAssignedWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const res = await api.get('/workers?status=active');
        setWorkersList(res.data.data || []);
      } catch (e) {
        toast.error('Failed to load workers');
      }
    };
    fetchWorkers();
  }, []);

  useEffect(() => {
    if (camp) {
      setFormData({
        ...camp,
        startDate: camp.startDate.split('T')[0],
        endDate: camp.endDate.split('T')[0],
        totalWorkAmount: camp.totalWorkAmount || 0
      });
      
      const fetchAssigned = async () => {
        try {
          const res = await api.get(`/camps/${camp.id}/workers`);
          if (res.data.data && res.data.data.workers) {
            const assigned = res.data.data.workers.map(w => ({
              workerId: w.workerId,
              campPay: w.campPay || ''
            }));
            setAssignedWorkers(assigned);
          }
        } catch (e) {
          console.error('Failed to fetch assigned workers', e);
        }
      };
      fetchAssigned();
    }
  }, [camp]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleWorkerToggle = (workerId) => {
    const exists = assignedWorkers.find(w => w.workerId === workerId);
    if (exists) {
      setAssignedWorkers(assignedWorkers.filter(w => w.workerId !== workerId));
    } else {
      setAssignedWorkers([...assignedWorkers, { workerId, campPay: '' }]);
    }
  };

  const handleWorkerAmountChange = (workerId, amount) => {
    setAssignedWorkers(assignedWorkers.map(w => w.workerId === workerId ? { ...w, campPay: amount === '' ? '' : Number(amount) } : w));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        durationDays: Number(formData.durationDays),
        totalWorkAmount: Number(formData.totalWorkAmount)
      };

      let currentCampId = camp?.id;
      if (camp) {
        await api.put(`/camps/${camp.id}`, payload);
        toast.success('Camp updated');
      } else {
        const res = await api.post('/camps', payload);
        currentCampId = res.data.data.id;
        toast.success('Camp created');
      }

      // Sync assigned workers
      if (currentCampId && assignedWorkers.length > 0) {
        const workersPayload = assignedWorkers.map(w => ({
          workerId: w.workerId,
          campPay: w.campPay === '' ? 0 : Number(w.campPay)
        }));
        await api.post(`/camps/${currentCampId}/workers`, { workers: workersPayload });
      }

      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save camp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} title={camp ? 'Edit Camp' : 'Add Camp'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Location</label>
          <input type="text" name="location" required value={formData.location} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Start Date</label>
            <input type="date" name="startDate" required value={formData.startDate} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 [color-scheme:dark]" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">End Date</label>
            <input type="date" name="endDate" required value={formData.endDate} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 [color-scheme:dark]" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Duration (Days)</label>
            <select name="durationDays" value={formData.durationDays} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100">
              <option value="1">1 Day</option>
              <option value="3">3 Days</option>
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100">
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Total Work Amount (₹)</label>
          <input type="number" name="totalWorkAmount" min="0" value={formData.totalWorkAmount} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
        </div>

        <div className="border border-slate-700 rounded-lg p-4 space-y-3 bg-slate-800/50">
          <label className="block text-sm font-medium text-slate-300">Assign Workers</label>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
            {workersList.map(worker => {
              const assigned = assignedWorkers.find(w => w.workerId === worker.id);
              return (
                <div key={worker.id} className="flex items-center justify-between p-2 hover:bg-slate-800 rounded bg-slate-900/50 transition-colors">
                  <label className="flex items-center gap-3 cursor-pointer text-slate-200 flex-1">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 accent-amber-500 cursor-pointer"
                      checked={!!assigned}
                      onChange={() => handleWorkerToggle(worker.id)}
                    />
                    <span>{worker.fullName} <span className="text-slate-500 text-sm">({worker.role || 'Worker'})</span></span>
                  </label>
                  
                  {assigned && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-sm">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg p-1 text-sm text-slate-100 text-right focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                        value={assigned.campPay}
                        onChange={(e) => handleWorkerAmountChange(worker.id, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {workersList.length === 0 && <div className="text-slate-500 text-sm text-center py-2">No active workers found.</div>}
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:border-amber-500 outline-none" rows="2"></textarea>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-medium transition-colors disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Camp'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
