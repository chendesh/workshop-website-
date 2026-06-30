import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import toast from 'react-hot-toast';
import { Calculator, Pencil, Check, X } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';
import { formatDate } from '../../utils/formatters';

// ── Inline Editable Wage Cell (Weekly View) ───────────────────
function EditableWageCell({ wage, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(wage.totalWage ?? 0);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = async () => {
    const numVal = Number(value);
    if (isNaN(numVal) || numVal < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(`/wages/${wage.id}/amount`, { totalWage: numVal });
      toast.success('Wage updated!');
      setEditing(false);
      onSaved(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update wage');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setEditing(false); setValue(wage.totalWage ?? 0); }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 text-sm">₹</span>
        <input
          ref={inputRef}
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-24 bg-slate-700 border border-amber-500/70 rounded px-2 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button onClick={handleSave} disabled={saving} className="text-green-400 hover:text-green-300 disabled:opacity-50"><Check className="w-4 h-4" /></button>
        <button onClick={() => { setEditing(false); setValue(wage.totalWage ?? 0); }} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <span className="text-slate-200 font-medium">₹{(wage.totalWage ?? 0).toLocaleString('en-IN')}</span>
      <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-amber-400 hover:text-amber-300 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
    </div>
  );
}

export default function Wages() {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' or 'weekly'

  // Weekly State
  const [weeklyWages, setWeeklyWages] = useState([]);
  const [loadingWeekly, setLoadingWeekly] = useState(true);
  const [calculating, setCalculating] = useState(false);

  // Daily State
  const [dailyDate, setDailyDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [workers, setWorkers] = useState([]);
  const [dailyWagesMap, setDailyWagesMap] = useState({}); // workerId -> { amount, status }
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [savingDaily, setSavingDaily] = useState(false);

  useEffect(() => {
    if (activeTab === 'weekly') {
      fetchWeeklyWages();
    } else {
      fetchDailyData();
    }
  }, [activeTab, dailyDate]);

  // ── Weekly Methods ──────────────────────────────────────────
  const fetchWeeklyWages = async () => {
    setLoadingWeekly(true);
    try {
      const res = await api.get('/wages');
      setWeeklyWages(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch weekly wages');
    } finally {
      setLoadingWeekly(false);
    }
  };

  const handleCalculateWeekly = async () => {
    setCalculating(true);
    try {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      const weekStartDate = [
        String(monday.getDate()).padStart(2, '0'),
        String(monday.getMonth() + 1).padStart(2, '0'),
        monday.getFullYear(),
      ].join('/');

      const res = await api.post('/wages/calculate', { weekStartDate });
      toast.success(res.data.message);
      fetchWeeklyWages();
    } catch (error) {
      toast.error('Failed to calculate wages');
    } finally {
      setCalculating(false);
    }
  };

  const toggleWeeklyStatus = async (wage) => {
    try {
      const newStatus = wage.status === 'pending' ? 'paid' : 'pending';
      const res = await api.put(`/wages/${wage.id}`, { status: newStatus });
      toast.success(`Wage marked as ${newStatus}`);
      setWeeklyWages(prev => prev.map(w => w.id === res.data.data.id ? res.data.data : w));
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const weeklyColumns = [
    { key: 'workerName', label: 'Worker' },
    { key: 'weekStart', label: 'Week Start' },
    { key: 'weekEnd', label: 'Week End' },
    { key: 'daysPresent', label: 'Full Days' },
    { key: 'halfDays', label: 'Half Days' },
    {
      key: 'totalWage', label: 'Total Wage',
      render: (val, wage) => <EditableWageCell wage={wage} onSaved={(u) => setWeeklyWages(prev => prev.map(w => w.id === u.id ? u : w))} />
    },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'actions', label: 'Actions',
      render: (_, wage) => (
        <button onClick={() => toggleWeeklyStatus(wage)} className={`text-sm px-3 py-1 rounded border ${wage.status === 'pending' ? 'border-green-500 text-green-500 hover:bg-green-500/10' : 'border-amber-500 text-amber-500 hover:bg-amber-500/10'}`}>
          Mark {wage.status === 'pending' ? 'Paid' : 'Pending'}
        </button>
      )
    }
  ];

  // ── Daily Methods ──────────────────────────────────────────
  const fetchDailyData = async () => {
    setLoadingDaily(true);
    try {
      // Convert 'YYYY-MM-DD' to 'DD/MM/YYYY' for API
      const [year, month, day] = dailyDate.split('-');
      const formattedDate = `${day}/${month}/${year}`;

      const [workersRes, wagesRes] = await Promise.all([
        api.get('/workers?status=active'),
        api.get(`/wages/daily?date=${formattedDate}`)
      ]);

      setWorkers(workersRes.data.data);

      const map = {};
      wagesRes.data.data.forEach(w => {
        map[w.workerId] = { amount: w.amount, status: w.status };
      });

      // Initialize missing workers with their default daily rate
      workersRes.data.data.forEach(w => {
        if (!map[w.id]) {
          map[w.id] = { amount: w.dailyRate || 0, status: 'not_paid' };
        }
      });
      setDailyWagesMap(map);
    } catch (error) {
      toast.error('Failed to fetch daily wages');
    } finally {
      setLoadingDaily(false);
    }
  };

  const handleDailyWageChange = (workerId, field, value) => {
    setDailyWagesMap(prev => ({
      ...prev,
      [workerId]: { ...prev[workerId], [field]: value }
    }));
  };

  const handleBulkDailyStatus = (status) => {
    const newMap = { ...dailyWagesMap };
    Object.keys(newMap).forEach(id => {
      newMap[id].status = status;
    });
    setDailyWagesMap(newMap);
  };

  const saveDailyWages = async () => {
    setSavingDaily(true);
    try {
      const [year, month, day] = dailyDate.split('-');
      const formattedDate = `${day}/${month}/${year}`;

      const records = workers.map(w => ({
        workerId: w.id,
        workerName: w.fullName,
        amount: dailyWagesMap[w.id].amount,
        status: dailyWagesMap[w.id].status
      }));

      await api.post('/wages/daily', { date: formattedDate, records });
      toast.success('Daily wages saved');
    } catch (error) {
      toast.error('Failed to save daily wages');
    } finally {
      setSavingDaily(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-outfit text-slate-100">Wages</h1>
          <p className="text-slate-400">Manage daily payments and calculate weekly wages.</p>
        </div>
        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'daily' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Daily Payments
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'weekly' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Weekly Summary
          </button>
        </div>
      </div>

      {activeTab === 'daily' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <label className="text-slate-400">Date:</label>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                onKeyDown={(e) => e.preventDefault()}
                className="bg-slate-900 border border-slate-600 rounded p-1.5 text-sm text-slate-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleBulkDailyStatus('paid')} className="px-3 py-1 bg-green-500/20 text-green-500 rounded border border-green-500/50 hover:bg-green-500/30">All Paid</button>
              <button onClick={() => handleBulkDailyStatus('not_paid')} className="px-3 py-1 bg-red-500/20 text-red-500 rounded border border-red-500/50 hover:bg-red-500/30">All Not Paid</button>
              <button
                onClick={saveDailyWages}
                disabled={savingDaily}
                className="ml-4 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-medium transition-colors"
              >
                {savingDaily ? 'Saving...' : 'Save Daily Wages'}
              </button>
            </div>
          </div>

          {loadingDaily ? (
            <div className="text-center py-8 text-slate-400">Loading daily wages...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900/50 text-slate-400">
                  <tr>
                    <th className="p-4 font-medium rounded-tl-lg">Worker</th>
                    <th className="p-4 font-medium">Designation</th>
                    <th className="p-4 font-medium">Wage Amount (₹)</th>
                    <th className="p-4 font-medium rounded-tr-lg">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {workers.map(worker => {
                    const rowData = dailyWagesMap[worker.id] || { amount: 0, status: 'not_paid' };
                    return (
                      <tr key={worker.id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="p-4 text-slate-200">{worker.fullName}</td>
                        <td className="p-4 text-slate-400 text-sm">{worker.designation || '—'}</td>
                        <td className="p-4">
                          <input
                            type="number"
                            min="0"
                            value={rowData.amount}
                            onChange={(e) => handleDailyWageChange(worker.id, 'amount', e.target.value)}
                            className="w-28 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleDailyWageChange(worker.id, 'status', rowData.status === 'paid' ? 'not_paid' : 'paid')}
                            className={`px-3 py-1.5 rounded border text-sm flex items-center justify-center gap-1 w-28 transition-colors ${
                              rowData.status === 'paid'
                                ? 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30'
                            }`}
                          >
                            {rowData.status === 'paid' ? <Check className="w-4 h-4"/> : <X className="w-4 h-4"/>}
                            {rowData.status === 'paid' ? 'Paid' : 'Not Paid'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {workers.length === 0 && (
                    <tr><td colSpan="4" className="text-center p-8 text-slate-500">No active workers found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'weekly' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleCalculateWeekly}
              disabled={calculating}
              className="bg-amber-500/20 text-amber-500 border border-amber-500/50 hover:bg-amber-500/30 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              <Calculator className="w-4 h-4" />
              {calculating ? 'Calculating...' : 'Calculate This Week'}
            </button>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <DataTable columns={weeklyColumns} data={weeklyWages} loading={loadingWeekly} searchKey="workerName" />
          </div>
        </div>
      )}
    </div>
  );
}
