import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import AttendanceCalendar from '../../components/AttendanceCalendar';

export default function Attendance() {
  const [workers, setWorkers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [year, month, day] = selectedDate.split('-');
      const formattedDate = `${day}/${month}/${year}`;

      const [workersRes, attRes] = await Promise.all([
        api.get('/workers?status=active'),
        api.get(`/attendance?date=${formattedDate}`)
      ]);
      setWorkers(workersRes.data.data);
      
      const attMap = {};
      attRes.data.data.forEach(a => {
        attMap[a.workerId] = a.status;
      });
      setAttendance(attMap);
    } catch (error) {
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (workerId, status) => {
    setAttendance(prev => ({ ...prev, [workerId]: status }));
  };

  const handleBulkMark = (status) => {
    const newAtt = {};
    workers.forEach(w => {
      newAtt[w.id] = status;
    });
    setAttendance(newAtt);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const [year, month, day] = selectedDate.split('-');
      const formattedDate = `${day}/${month}/${year}`;

      const payload = {
        date: formattedDate,
        records: Object.keys(attendance).map(workerId => ({
          workerId,
          status: attendance[workerId]
        }))
      };
      await api.post('/attendance/bulk', payload);
      toast.success('Attendance saved');
    } catch (error) {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-outfit text-slate-100">Attendance</h1>
        <p className="text-slate-400">Mark and manage worker attendance.</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <label className="text-slate-400">Date:</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              onKeyDown={(e) => e.preventDefault()}
              className="bg-slate-900 border border-slate-600 rounded p-1.5 text-sm text-slate-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleBulkMark('present')} className="px-3 py-1 bg-green-500/20 text-green-500 rounded border border-green-500/50 hover:bg-green-500/30">All Present</button>
            <button onClick={() => handleBulkMark('absent')} className="px-3 py-1 bg-red-500/20 text-red-500 rounded border border-red-500/50 hover:bg-red-500/30">All Absent</button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="ml-4 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 text-slate-400">
                <tr>
                  <th className="p-4 font-medium rounded-tl-lg">Worker</th>
                  <th className="p-4 font-medium">Designation</th>
                  <th className="p-4 font-medium rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {workers.map(worker => (
                  <tr key={worker.id} className="hover:bg-slate-700/20">
                    <td className="p-4 text-slate-200">{worker.fullName}</td>
                    <td className="p-4 text-slate-400 text-sm">{worker.designation}</td>
                    <td className="p-4">
                      <select 
                        value={attendance[worker.id] || ''} 
                        onChange={(e) => handleStatusChange(worker.id, e.target.value)}
                        className={`bg-slate-900 border border-slate-700 rounded p-1 text-sm ${
                            attendance[worker.id] === 'present' ? 'text-green-400 border-green-400/50' :
                            attendance[worker.id] === 'absent' ? 'text-red-400 border-red-400/50' :
                            attendance[worker.id] === 'half_day' ? 'text-amber-400 border-amber-400/50' :
                            'text-slate-100'
                        }`}
                      >
                        <option value="">-- Select --</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="half_day">Half Day</option>
                        <option value="on_leave">On Leave</option>
                        <option value="on_camp">On Camp</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Read-only calendar view is shown inside MyAttendance for workers, or can be added here for a single worker view */}
    </div>
  );
}
