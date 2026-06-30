import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import CampForm from './CampForm';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatters';

export default function Camps() {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState(null);

  useEffect(() => {
    fetchCamps();
  }, []);

  const fetchCamps = async () => {
    try {
      const res = await api.get('/camps');
      setCamps(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch camps');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (camp) => {
    setSelectedCamp(camp);
    setIsFormOpen(true);
  };

  const handleDelete = (camp) => {
    setSelectedCamp(camp);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/camps/${selectedCamp.id}`);
      toast.success('Camp deleted');
      fetchCamps();
      setIsDeleteOpen(false);
    } catch (error) {
      toast.error('Failed to delete camp');
    }
  };

  const columns = [
    { key: 'location', label: 'Location' },
    { key: 'startDate', label: 'Start Date', render: (val) => formatDate(val) },
    { key: 'endDate', label: 'End Date', render: (val) => formatDate(val) },
    { key: 'durationDays', label: 'Duration (Days)' },
    { key: 'totalWorkAmount', label: 'Total Amount (₹)', render: (val) => val ? `₹${val}` : '—' },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, camp) => (
        <div className="flex gap-2">
          <button onClick={() => handleEdit(camp)} className="text-amber-500 hover:text-amber-400">Edit</button>
          <button onClick={() => handleDelete(camp)} className="text-red-500 hover:text-red-400">Delete</button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-outfit text-slate-100">Camp Management</h1>
          <p className="text-slate-400">Manage off-site work assignments.</p>
        </div>
        <button
          onClick={() => { setSelectedCamp(null); setIsFormOpen(true); }}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Camp
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <DataTable
          columns={columns}
          data={camps}
          loading={loading}
          searchKey="location"
        />
      </div>

      {isFormOpen && (
        <CampForm
          camp={selectedCamp}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            fetchCamps();
          }}
        />
      )}

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Camp"
        message={`Are you sure you want to delete this camp at ${selectedCamp?.location}?`}
      />
    </div>
  );
}
