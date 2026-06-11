import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function WorkerForm({ worker, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    designation: 'Helper',
    dailyRate: '',
    advanceAmount: 0,
    joinDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (worker) {
      setFormData({
        fullName: worker.fullName || '',
        phone: worker.phone || '',
        designation: worker.designation || 'Helper',
        dailyRate: worker.dailyRate || '',
        advanceAmount: worker.advanceAmount || 0,
        joinDate: worker.joinDate ? worker.joinDate.split('T')[0] : new Date().toISOString().split('T')[0]
      });
    }
  }, [worker]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        dailyRate: Number(formData.dailyRate),
        advanceAmount: Number(formData.advanceAmount)
      };

      if (worker) {
        await api.put(`/workers/${worker.id}`, payload);
        toast.success('Worker updated');
        onSuccess(null);
      } else {
        const res = await api.post('/workers', payload);
        toast.success('Worker created');
        onSuccess(res.data.data.credentials); // Pass creds back
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save worker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} title={worker ? 'Edit Worker' : 'Add Worker'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Full Name</label>
          <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Phone</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Designation</label>
            <select name="designation" value={formData.designation} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100">
              <option value="Helper">Helper</option>
              <option value="Excavator Operator">Excavator Operator</option>
              <option value="Welder">Welder</option>
              <option value="Driver">Driver</option>
              <option value="Supervisor">Supervisor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Daily Rate (₹)</label>
            <input type="number" name="dailyRate" required value={formData.dailyRate} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Advance (₹)</label>
            <input type="number" name="advanceAmount" value={formData.advanceAmount} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Join Date</label>
            <input type="date" name="joinDate" value={formData.joinDate} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-medium">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
