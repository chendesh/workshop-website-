import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  UserCircle,
  LogOut,
  Hammer,
} from 'lucide-react';

const workerNavItems = [
  { to: '/worker', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/worker/attendance', icon: Calendar, label: 'My Attendance' },
  { to: '/worker/wages', icon: Wallet, label: 'My Wages' },
  { to: '/worker/profile', icon: UserCircle, label: 'My Profile' },
];

const WorkerSidebar = () => {
  const { logout, user } = useAuth();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen z-40 w-64 flex flex-col bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
            <Hammer className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-heading font-bold gradient-text truncate">DigiWork</h1>
            <p className="text-[10px] text-gray-500 truncate">Worker Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {workerNavItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-slate-700/50 space-y-2">
        {user && (
          <div className="px-4 py-2">
            <p className="text-sm font-medium text-gray-300 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">Worker</p>
          </div>
        )}
        <button
          onClick={logout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default WorkerSidebar;
