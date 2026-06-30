import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import WorkerForm from './WorkerForm';
import toast from 'react-hot-toast';
import { Plus, KeySquare, UserX, UserCheck, RefreshCw } from 'lucide-react';
import RupeeDisplay from '../../components/RupeeDisplay';

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    // Real-time Firestore listener for workers collection
    const q = query(collection(db, 'workers'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workersData = snapshot.docs.map((doc) => doc.data());
      workersData.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      setWorkers(workersData);
      setLoading(false);
    }, (error) => {
      console.error('Workers listener error:', error);
      toast.error('Failed to fetch workers');
      setLoading(false);
    });

    return () => unsubscribe();
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

  const handleRecalculateAll = async () => {
    if (!window.confirm('Recalculate balance and advance totals for ALL workers from raw Firestore data? This corrects any stale values.')) return;
    setRecalculating(true);
    try {
      const res = await api.post('/wages/recalculate-all');
      toast.success(res.data.message || 'All worker balances recalculated!');
    } catch (error) {
      console.error('Recalculate balances error:', error);
      const msg = error.response?.data?.message || error.message || 'Unknown error occurred';
      toast.error(`Failed to recalculate balances: ${msg}`, { duration: 5000 });
    } finally {
      setRecalculating(false);
    }
  };

  // Calculate balance summary
  const totalBalance = workers.reduce((sum, w) => sum + (w.balanceAmount || 0), 0);
  const workersWithBalance = workers.filter((w) => (w.balanceAmount || 0) > 0).length;

  const columns = [
    { key: 'fullName', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'designation', label: 'Designation' },
    { key: 'dailyRate', label: 'Daily Rate', render: (val) => <RupeeDisplay amount={val} /> },
    { key: 'advanceAmount', label: 'Advance', render: (val) => <RupeeDisplay amount={val || 0} /> },
    {
      key: 'balanceAmount',
      label: 'Balance',
      render: (val) => {
        const balance = val || 0;
        return (
          <div className="flex items-center gap-2">
            <span className={balance > 0 ? 'text-red-400 font-bold' : 'text-green-400'}>
              ₹{balance.toLocaleString('en-IN')}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs border ${
              balance > 0
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-green-500/10 text-green-400 border-green-500/20'
            }`}>
              {balance > 0 ? 'Pending' : 'Cleared'}
            </span>
          </div>
        );
      }
    },
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
      <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculateAll}
            disabled={recalculating}
            title="Recalculate balance & advance totals from raw data"
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg font-medium flex items-center gap-2 border border-slate-600 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalculating...' : 'Recalculate Balances'}
          </button>
          <button
            onClick={() => { setSelectedWorker(null); setIsFormOpen(true); }}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Worker
          </button>
        </div>
      </div>

      {/* Balance Summary Line */}
      {!loading && (
        <div className="text-sm">
          {totalBalance > 0 ? (
            <p className="text-slate-300">
              Total Outstanding Balance:{' '}
              <span className="text-red-400 font-bold">₹{totalBalance.toLocaleString('en-IN')}</span>
              {' '}across{' '}
              <span className="text-red-400 font-bold">{workersWithBalance}</span>
              {' '}worker{workersWithBalance !== 1 ? 's' : ''}
            </p>
          ) : (
            <p className="text-green-400">All worker balances are cleared ✓</p>
          )}
        </div>
      )}

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
