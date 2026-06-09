import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { format } from 'date-fns';

export default function MyAttendance() {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Need the worker ID. Assuming we fetch it or it's attached to the user.
  // We can fetch from an endpoint that returns the current worker's own attendance.
  // /api/attendance/worker/:workerId (We'll use 'me' and handle it in the backend, or fetch user profile first)

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  const fetchMyAttendance = async () => {
    try {
      // Fetch profile to get workerId first, or pass it if it's in the token
      const profileRes = await api.get('/auth/me');
      const workerId = profileRes.data.data.workerProfile?.id;

      if (workerId) {
          const res = await api.get(`/attendance/worker/${workerId}`);
          setAttendanceRecords(res.data.data.records || []);
      }
    } catch (error) {
      toast.error('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-outfit text-slate-100">My Attendance</h1>
        <p className="text-slate-400">Your attendance calendar.</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        {loading ? (
           <div className="text-center py-8 text-slate-400">Loading calendar...</div>
        ) : (
           <AttendanceCalendar attendance={attendanceRecords} />
        )}
      </div>
    </div>
  );
}
