import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function WorkLogForm({ log, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    clientName: '',
    clientPhone: '',
    workType: 'Excavation',
    location: '',
    description: '',
    quotedAmount: '',
    receivedAmount: '',
    spentAmount: '',
    status: 'Pending',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (log) {
      setFormData({
        ...log,
        date: log.date.split('T')[0]
      });
    }
  }, [log]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        quotedAmount: Number(formData.quotedAmount),
        receivedAmount: Number(formData.receivedAmount),
        spentAmount: Number(formData.spentAmount)
      };

      if (log) {
        await api.put(`/work-logs/${log.id}`, payload);
        toast.success('Work log updated');
      } else {
        await api.post('/work-logs', payload);
        toast.success('Work log created');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save work log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} title={log ? 'Edit Work Log' : 'Add Work Log'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Date</label>
            <input type="date" name="date" required value={formData.date} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Client Name</label>
            <input type="text" name="clientName" required value={formData.clientName} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Client Phone</label>
            <input type="text" name="clientPhone" value={formData.clientPhone} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Work Type</label>
            <select name="workType" value={formData.workType} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100">
              <option>Excavation</option>
              <option>Welding</option>
              <option>Cutting</option>
              <option>Demolition</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Quoted Amount (₹)</label>
            <input type="number" name="quotedAmount" required value={formData.quotedAmount} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Received Amount (₹)</label>
            <input type="number" name="receivedAmount" value={formData.receivedAmount} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Spent Amount (₹)</label>
            <input type="number" name="spentAmount" value={formData.spentAmount} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100">
              <option>Pending</option>
              <option value="In Progress">In Progress</option>
              <option>Completed</option>
              <option value="Payment Due">Payment Due</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Location</label>
          <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" rows="3"></textarea>
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
