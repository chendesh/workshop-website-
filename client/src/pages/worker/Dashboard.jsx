import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, IndianRupee } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WorkerDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-outfit text-slate-100">Welcome, {user?.fullName || 'Worker'}!</h1>
        <p className="text-slate-400">Here is your personal dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/worker/attendance" className="bg-slate-800 border border-slate-700 hover:border-amber-500 rounded-xl p-6 transition-all group">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-500/20 rounded-lg group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-100">My Attendance</h2>
          </div>
          <p className="text-slate-400">View your monthly attendance calendar and history.</p>
        </Link>

        <Link to="/worker/wages" className="bg-slate-800 border border-slate-700 hover:border-amber-500 rounded-xl p-6 transition-all group">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg group-hover:scale-110 transition-transform">
              <IndianRupee className="w-6 h-6 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-100">My Wages</h2>
          </div>
          <p className="text-slate-400">Check your weekly salary, camp pay, and payment status.</p>
        </Link>
      </div>
    </div>
  );
}
