import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import WorkerForm from './WorkerForm';
import toast from 'react-hot-toast';
import { Plus, KeySquare, UserX, UserCheck } from 'lucide-react';
import RupeeDisplay from '../../components/RupeeDisplay';

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/workers');
      setWorkers(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch workers');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (worker) => {
    setSelectedWorker(worker);
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (worker) => {
    if (window.confirm(`Are you sure you want to ${worker.isActive ? 'deactivate' : 'activate'} ${worker.fullName}?`)) {
      try {
        await api.put(`/workers/${worker.id}/deactivate`);
        toast.success(`Worker ${worker.isActive ? 'deactivated' : 'activated'}`);
        fetchWorkers();
      } catch (error) {
        toast.error('Failed to change status');
      }
    }
  };

  const handleResetPassword = async (worker) => {
    if (window.confirm(`Reset password for ${worker.fullName}?`)) {
      try {
        const res = await api.put(`/workers/${worker.id}/reset-password`);
        toast.success(`New password: ${res.data.data.newPassword}`, { duration: 10000 });
      } catch (error) {
        toast.error('Failed to reset password');
      }
    }
  };

  const columns = [
    { key: 'fullName', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'designation', label: 'Designation' },
    { key: 'dailyRate', label: 'Daily Rate', render: (val) => <RupeeDisplay amount={val} /> },
    { key: 'advanceAmount', label: 'Advance', render: (val) => <RupeeDisplay amount={val || 0} /> },
    { 
      key: 'isActive', 
      label: 'Status', 
      render: (val) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${val ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-red-500/20 text-red-500 border border-red-500/50'}`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      ) 
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, worker) => (
        <div className="flex gap-3">
          <button onClick={() => handleEdit(worker)} className="text-amber-500 hover:text-amber-400" title="Edit">Edit</button>
          <button onClick={() => handleResetPassword(worker)} className="text-blue-500 hover:text-blue-400" title="Reset Password">
            <KeySquare className="w-4 h-4" />
          </button>
          <button onClick={() => handleToggleStatus(worker)} className={worker.isActive ? "text-red-500 hover:text-red-400" : "text-green-500 hover:text-green-400"} title="Toggle Status">
            {worker.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-outfit text-slate-100">Workers</h1>
          <p className="text-slate-400">Manage your workforce.</p>
        </div>
        <button
          onClick={() => { setSelectedWorker(null); setIsFormOpen(true); }}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Worker
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <DataTable
          columns={columns}
          data={workers}
          loading={loading}
          searchKey="fullName"
        />
      </div>

      {isFormOpen && (
        <WorkerForm
          worker={selectedWorker}
          onClose={() => setIsFormOpen(false)}
          onSuccess={(newCreds) => {
            setIsFormOpen(false);
            fetchWorkers();
            if (newCreds) {
              // Assuming your worker form returns credentials on create
              toast.success(`Generated Username: ${newCreds.username}\nPassword: ${newCreds.temporaryPassword}`, { duration: 15000 });
            }
          }}
        />
      )}
    </div>
  );
}
