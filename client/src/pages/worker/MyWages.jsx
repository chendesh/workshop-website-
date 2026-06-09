import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import RupeeDisplay from '../../components/RupeeDisplay';

export default function MyWages() {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' or 'weekly'
  const [weeklyWages, setWeeklyWages] = useState([]);
  const [dailyWages, setDailyWages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyWages();
  }, []);

  const fetchMyWages = async () => {
    setLoading(true);
    try {
      const profileRes = await api.get('/auth/me');
      const workerId = profileRes.data.data.workerProfile?.id;

      if (workerId) {
        const [weeklyRes, dailyRes] = await Promise.all([
          api.get(`/wages/worker/${workerId}`),
          api.get(`/wages/daily/worker/${workerId}`)
        ]);
        setWeeklyWages(weeklyRes.data.data);
        setDailyWages(dailyRes.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch wages');
    } finally {
      setLoading(false);
    }
  };

  const weeklyColumns = [
    { key: 'weekStart', label: 'Week Start' },
    { key: 'weekEnd', label: 'Week End' },
    { key: 'daysPresent', label: 'Full Days' },
    { key: 'halfDays', label: 'Half Days' },
    { key: 'campPay', label: 'Camp Pay', render: (val) => <RupeeDisplay amount={val} /> },
    { key: 'totalWage', label: 'Total Wage', render: (val) => <RupeeDisplay amount={val} /> },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> }
  ];

  const dailyColumns = [
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Daily Wage', render: (val) => <RupeeDisplay amount={val} /> },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val === 'paid' ? 'paid' : 'pending'} /> }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-outfit text-slate-100">My Wages</h1>
          <p className="text-slate-400">View your daily and weekly payments.</p>
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

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        {activeTab === 'daily' ? (
           <DataTable
             columns={dailyColumns}
             data={dailyWages}
             loading={loading}
             searchKey="date"
           />
        ) : (
           <DataTable
             columns={weeklyColumns}
             data={weeklyWages}
             loading={loading}
             searchKey="weekStart"
           />
        )}
      </div>
    </div>
  );
}
