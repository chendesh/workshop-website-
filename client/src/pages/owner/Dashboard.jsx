import React, { useState, useEffect } from 'react';
import { Users, Truck, IndianRupee, AlertCircle, ClipboardList, Calendar, Wallet, FileText, ArrowRight, Clock, Wrench, HardHat, Cog, Phone, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../../components/StatsCard';
import api from '../../services/api';
import toast from 'react-hot-toast';
import RupeeDisplay from '../../components/RupeeDisplay';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

// ── Workshop SVG Illustration ───────────────────────────────────
function WorkshopIllustration() {
  return (
    <svg viewBox="0 0 600 200" fill="none" xmlns="https://www.w3.org/2000/svg" className="w-full h-auto opacity-80">
      {/* Ground */}
      <rect x="0" y="170" width="600" height="30" rx="4" fill="url(#ground)" />
      {/* Building */}
      <rect x="40" y="60" width="180" height="110" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2"/>
      <polygon points="130,20 30,60 230,60" fill="#1e293b" stroke="#334155" strokeWidth="2"/>
      {/* Windows */}
      <rect x="60" y="80" width="30" height="30" rx="3" fill="#f59e0b" opacity="0.3"/>
      <rect x="110" y="80" width="30" height="30" rx="3" fill="#f59e0b" opacity="0.5"/>
      <rect x="160" y="80" width="30" height="30" rx="3" fill="#f59e0b" opacity="0.2"/>
      {/* Door */}
      <rect x="105" y="120" width="50" height="50" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5"/>
      <circle cx="148" cy="147" r="3" fill="#f59e0b"/>
      {/* Chimney */}
      <rect x="180" y="30" width="20" height="35" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1.5"/>
      {/* Smoke */}
      <circle cx="190" cy="22" r="6" fill="#475569" opacity="0.4">
        <animate attributeName="cy" values="22;12;22" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="196" cy="16" r="4" fill="#475569" opacity="0.3">
        <animate attributeName="cy" values="16;6;16" dur="3.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.3;0.05;0.3" dur="3.5s" repeatCount="indefinite"/>
      </circle>
      {/* Gear icon */}
      <g transform="translate(300, 90)">
        <circle cx="30" cy="30" r="28" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" opacity="0.6">
          <animateTransform attributeName="transform" type="rotate" from="0 30 30" to="360 30 30" dur="10s" repeatCount="indefinite"/>
        </circle>
        <circle cx="30" cy="30" r="10" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.4"/>
        {/* Teeth */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <rect key={i} x="27" y="0" width="6" height="10" rx="2" fill="#f59e0b" opacity="0.5"
            transform={`rotate(${angle} 30 30)`}>
            <animateTransform attributeName="transform" type="rotate" from={`${angle} 30 30`} to={`${angle + 360} 30 30`} dur="10s" repeatCount="indefinite"/>
          </rect>
        ))}
      </g>
      {/* Second gear */}
      <g transform="translate(370, 100)">
        <circle cx="20" cy="20" r="18" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" opacity="0.5">
          <animateTransform attributeName="transform" type="rotate" from="360 20 20" to="0 20 20" dur="8s" repeatCount="indefinite"/>
        </circle>
        <circle cx="20" cy="20" r="7" fill="none" stroke="#64748b" strokeWidth="1.5" opacity="0.3"/>
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <rect key={i} x="18" y="0" width="4" height="8" rx="1.5" fill="#64748b" opacity="0.4"
            transform={`rotate(${angle} 20 20)`}>
            <animateTransform attributeName="transform" type="rotate" from={`${360 + angle} 20 20`} to={`${angle} 20 20`} dur="8s" repeatCount="indefinite"/>
          </rect>
        ))}
      </g>
      {/* Workers */}
      <g transform="translate(440, 110)">
        <circle cx="15" cy="10" r="8" fill="#f59e0b" opacity="0.6"/>
        <rect x="8" y="20" width="14" height="25" rx="5" fill="#334155"/>
        <rect x="3" y="5" width="24" height="6" rx="3" fill="#f59e0b" opacity="0.4"/>
      </g>
      <g transform="translate(490, 115)">
        <circle cx="15" cy="10" r="8" fill="#64748b" opacity="0.6"/>
        <rect x="8" y="20" width="14" height="22" rx="5" fill="#334155"/>
      </g>
      {/* Sparks */}
      <circle cx="460" cy="140" r="2" fill="#f59e0b" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0;0.8" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="470" cy="135" r="1.5" fill="#fbbf24" opacity="0.6">
        <animate attributeName="opacity" values="0;0.8;0" dur="1.2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="455" cy="145" r="1" fill="#fde68a" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0;0.5" dur="1.8s" repeatCount="indefinite"/>
      </circle>
      <defs>
        <linearGradient id="ground" x1="0" y1="170" x2="0" y2="200">
          <stop offset="0%" stopColor="#334155"/>
          <stop offset="100%" stopColor="#1e293b"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Quick Action Card ───────────────────────────────────────────
function QuickAction({ icon: Icon, label, description, to, color }) {
  const navigate = useNavigate();
  const colorClasses = {
    amber: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 hover:border-amber-500/60',
    green: 'from-green-500/20 to-emerald-500/10 border-green-500/30 hover:border-green-500/60',
    blue: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 hover:border-blue-500/60',
    purple: 'from-purple-500/20 to-violet-500/10 border-purple-500/30 hover:border-purple-500/60',
  };
  const iconColors = { amber: 'text-amber-400', green: 'text-green-400', blue: 'text-blue-400', purple: 'text-purple-400' };

  return (
    <button
      onClick={() => navigate(to)}
      className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br ${colorClasses[color]} p-5 text-left transition-all duration-300 hover:shadow-lg hover:scale-[1.02]`}
    >
      <div className="flex items-start justify-between">
        <div>
          <Icon className={`w-8 h-8 ${iconColors[color]} mb-3`} />
          <h3 className="text-slate-100 font-semibold text-sm">{label}</h3>
          <p className="text-slate-400 text-xs mt-1">{description}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors mt-1 group-hover:translate-x-1 transform duration-200" />
      </div>
    </button>
  );
}

// ── Recent Activity Item ────────────────────────────────────────
function ActivityItem({ icon: Icon, title, subtitle, time, color }) {
  const iconColors = { amber: 'text-amber-400 bg-amber-500/20', green: 'text-green-400 bg-green-500/20', blue: 'text-blue-400 bg-blue-500/20', red: 'text-red-400 bg-red-500/20' };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-700/30 last:border-0">
      <div className={`p-2 rounded-lg ${iconColors[color]} flex-shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-200 text-sm font-medium truncate">{title}</p>
        <p className="text-slate-400 text-xs truncate">{subtitle}</p>
      </div>
      <span className="text-slate-500 text-xs flex-shrink-0 flex items-center gap-1">
        <Clock className="w-3 h-3" /> {time}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalWorkers: 0,
    activeWorkLogs: 0,
    totalOutstanding: 0,
    todayAttendance: { present: 0, absent: 0 }
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // ── Real-time listener: Active Work Orders ──────────────────
    const workLogsQ = query(collection(db, 'workLogs'), orderBy('createdAt', 'desc'));
    const unsubWorkLogs = onSnapshot(workLogsQ, (snapshot) => {
      const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeLogs = allLogs.filter(log =>
        log.status === 'In Progress' || log.status === 'Pending'
      );
      setStats(prev => ({ ...prev, activeWorkLogs: activeLogs.length }));
      setRecentLogs(activeLogs.slice(0, 5));
    }, (error) => {
      console.error('Error fetching real-time work logs:', error);
    });

    // ── Real-time listener: Today's Attendance ──────────────────
    // Attendance is stored in DD/MM/YYYY format — build that string for today
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const todayFormatted = `${dd}/${mm}/${yyyy}`;

    const attQ = query(
      collection(db, 'attendance'),
      where('date', '==', todayFormatted)
    );
    const unsubAtt = onSnapshot(attQ, (snapshot) => {
      const records = snapshot.docs.map(doc => doc.data());
      const present = records.filter(r => r.status === 'present').length;
      const absent  = records.filter(r => r.status === 'absent').length;
      setStats(prev => ({ ...prev, todayAttendance: { present, absent } }));
    }, (error) => {
      console.error('Error fetching real-time attendance:', error);
    });

    return () => {
      unsubWorkLogs();
      unsubAtt();
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Attendance is handled by real-time onSnapshot above;
      // here we only fetch workers count and outstanding balance.
      const [workersRes, workLogsRes] = await Promise.all([
        api.get('/workers'),
        api.get('/work-logs/stats'),
      ]);

      const activeWorkers = workersRes.data.data.filter(w => w.isActive).length;

      setStats(prev => ({
        ...prev,
        totalWorkers: activeWorkers,
        totalOutstanding: workLogsRes.data.data.totalBalance || 0,
      }));

    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const diff = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diff < 60) return `${diff}m ago`;
      if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
      return `${Math.floor(diff / 1440)}d ago`;
    } catch { return ''; }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-outfit text-slate-100">Dashboard</h1>
        <p className="text-slate-400">Overview of your business operations today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Active Workers" value={stats.totalWorkers} icon={Users} color="amber" />
        <StatsCard
          title="Today's Present"
          value={stats.todayAttendance.present}
          subtitle={`${stats.todayAttendance.absent} absent`}
          icon={AlertCircle}
          color="green"
        />
        <StatsCard title="Active Work Orders" value={stats.activeWorkLogs} icon={Truck} color="blue" />
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-lg bg-red-500/20">
                <IndianRupee className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">Total Outstanding</h3>
              <div className="text-3xl font-bold text-slate-100 font-outfit">
                <RupeeDisplay amount={stats.totalOutstanding} />
              </div>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-red-500/10 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Workshop Illustration Banner */}
      <div className="relative bg-gradient-to-r from-slate-800 via-slate-800/80 to-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent"></div>
        <div className="relative flex flex-col lg:flex-row items-center gap-6 p-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold font-outfit text-slate-100 flex items-center gap-2">
              <HardHat className="w-6 h-6 text-amber-400" />
              DigiWork Engineering Workshop
            </h2>
            <p className="text-slate-400 text-sm mt-2 max-w-md">
              Manage your workers, track attendance, handle daily wages, and generate detailed weekly &amp; monthly reports — all in one place.
            </p>
            <div className="flex flex-wrap gap-4 mt-6">
              <a href="https://wa.me/919573744819" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/50 px-3 py-1.5 rounded-lg text-sm transition-colors shadow-lg">
                <MessageCircle className="w-4 h-4" /> WhatsApp: 9573744819
              </a>
              <a href="tel:9573744819" className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50 px-3 py-1.5 rounded-lg text-sm transition-colors shadow-lg">
                <Phone className="w-4 h-4" /> Call: 9573744819
              </a>
              <a href="tel:6281365760" className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50 px-3 py-1.5 rounded-lg text-sm transition-colors shadow-lg">
                <Phone className="w-4 h-4" /> Call: 6281365760
              </a>
            </div>
          </div>
          <div className="flex-1 max-w-sm">
            <WorkshopIllustration />
          </div>
        </div>
      </div>

      {/* Bottom Grid: Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-3">
          <h2 className="text-lg font-semibold font-outfit text-slate-100 mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" /> Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickAction icon={Users} label="Manage Workers" description="Add, edit, or view worker profiles" to="/owner/workers" color="amber" />
            <QuickAction icon={Calendar} label="Mark Attendance" description="Record today's attendance" to="/owner/attendance" color="green" />
            <QuickAction icon={Wallet} label="Process Wages" description="Track daily & weekly payments" to="/owner/wages" color="blue" />
            <QuickAction icon={FileText} label="Generate Reports" description="Weekly Excel & monthly PDF" to="/owner/reports" color="purple" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold font-outfit text-slate-100 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" /> Recent Activity
          </h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            {recentLogs.length > 0 ? (
              recentLogs.map((log, idx) => (
                <ActivityItem
                  key={log.id || idx}
                  icon={ClipboardList}
                  title={`${log.clientName || 'Work Order'} — ${log.workType || ''}`}
                  subtitle={log.location || log.description || ''}
                  time={getTimeAgo(log.createdAt)}
                  color={log.status === 'Completed' ? 'green' : log.status === 'Payment Due' ? 'red' : 'amber'}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <Cog className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-spin" style={{ animationDuration: '6s' }} />
                <p className="text-slate-400 text-sm">No recent activity yet</p>
                <p className="text-slate-500 text-xs mt-1">Work logs will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
