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
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (camp) {
      setFormData({
        ...camp,
        startDate: camp.startDate.split('T')[0],
        endDate: camp.endDate.split('T')[0]
      });
    }
  }, [camp]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        durationDays: Number(formData.durationDays)
      };

      if (camp) {
        await api.put(`/camps/${camp.id}`, payload);
        toast.success('Camp updated');
      } else {
        await api.post('/camps', payload);
        toast.success('Camp created');
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
            <input type="date" name="startDate" required value={formData.startDate} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">End Date</label>
            <input type="date" name="endDate" required value={formData.endDate} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Duration (Days)</label>
            <select name="durationDays" value={formData.durationDays} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100">
              <option value="1">1 Day</option>
              <option value="3">3 Days</option>
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
