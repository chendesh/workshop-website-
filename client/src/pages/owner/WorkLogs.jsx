import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import WorkLogForm from './WorkLogForm';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import RupeeDisplay from '../../components/RupeeDisplay';
import { formatDate } from '../../utils/formatters';

export default function WorkLogs() {
  const [workLogs, setWorkLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchWorkLogs();
  }, []);

  const fetchWorkLogs = async () => {
    try {
      const res = await api.get('/work-logs');
      setWorkLogs(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch work logs');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (log) => {
    setSelectedLog(log);
    setIsFormOpen(true);
  };

  const handleDelete = (log) => {
    setSelectedLog(log);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/work-logs/${selectedLog.id}`);
      toast.success('Work log deleted');
      fetchWorkLogs();
      setIsDeleteOpen(false);
    } catch (error) {
      toast.error('Failed to delete work log');
    }
  };

  const columns = [
    { key: 'orderId', label: 'Order ID' },
    { key: 'date', label: 'Date', render: (val) => formatDate(val) },
    { key: 'clientName', label: 'Client' },
    { key: 'workType', label: 'Type' },
    { key: 'quotedAmount', label: 'Quoted', render: (val) => <RupeeDisplay amount={val} /> },
    { key: 'balance', label: 'Balance', render: (val) => <RupeeDisplay amount={val} /> },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, log) => (
        <div className="flex gap-2">
          <button onClick={() => handleEdit(log)} className="text-amber-500 hover:text-amber-400">Edit</button>
          <button onClick={() => handleDelete(log)} className="text-red-500 hover:text-red-400">Delete</button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-outfit text-slate-100">Work Logs</h1>
          <p className="text-slate-400">Manage all business work orders.</p>
        </div>
        <button
          onClick={() => { setSelectedLog(null); setIsFormOpen(true); }}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Work Log
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <DataTable
          columns={columns}
          data={workLogs}
          loading={loading}
          searchKey="clientName"
        />
      </div>

      {isFormOpen && (
        <WorkLogForm
          log={selectedLog}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            fetchWorkLogs();
          }}
        />
      )}

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Work Log"
        message={`Are you sure you want to delete order ${selectedLog?.orderId}? This action cannot be undone.`}
      />
    </div>
  );
}
