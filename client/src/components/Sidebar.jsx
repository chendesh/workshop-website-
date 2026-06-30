import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, ClipboardList, Calendar, Wallet,
  Users, Tent, FileText, LogOut, Hammer,
  ChevronLeft, ChevronRight, Sun, Moon, Bell, Package
} from 'lucide-react';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const navItems = [
  { to: '/owner',              icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/owner/work-requests',icon: Bell,            label: 'Work Requests' },
  { to: '/owner/inventory',    icon: Package,         label: 'Inventory'  },
  { to: '/owner/work-logs',    icon: ClipboardList,   label: 'Work Logs'  },
  { to: '/owner/attendance',   icon: Calendar,        label: 'Attendance' },
  { to: '/owner/wages',        icon: Wallet,          label: 'Wages'      },
  { to: '/owner/workers',      icon: Users,           label: 'Workers'    },
  { to: '/owner/camps',        icon: Tent,            label: 'Camps'      },
  { to: '/owner/reports',      icon: FileText,        label: 'Reports'    },
];


const Sidebar = ({ onClose }) => {
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (user?.role !== 'owner') return;

    const q = query(collection(db, 'workRequests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach(doc => {
        if (!doc.data().read) count++;
      });
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <aside
      className={`
        relative h-screen flex flex-col
        bg-white border-r border-gray-200
        dark:bg-slate-900 dark:border-slate-700/50
        transition-all duration-300
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Brand */}
      <div className="px-4 py-5 border-b border-gray-200 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 flex-shrink-0">
            <Hammer className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-heading font-bold gradient-text truncate">DigiWork</h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Engineering Works</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={isActive ? 'sidebar-link-active relative' : 'sidebar-link relative'}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {item.to === '/owner/work-requests' && unreadCount > 0 && (
                <span className={`absolute right-2 flex items-center justify-center bg-amber-500 text-slate-900 font-bold text-[10px] rounded-full ${collapsed ? 'w-4 h-4 top-1 right-1' : 'px-2 py-0.5'}`}>
                  {unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-slate-700/50 space-y-1">

        {/* User info */}
        {!collapsed && user && (
          <div className="px-4 py-2 mb-1">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="sidebar-link w-full"
          title={collapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : undefined}
        >
          {isDark
            ? <Sun  className="w-5 h-5 flex-shrink-0 text-amber-400" />
            : <Moon className="w-5 h-5 flex-shrink-0 text-slate-500" />
          }
          {!collapsed && (
            <span className="text-gray-700 dark:text-gray-300">
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl w-full font-medium
            text-red-500 hover:text-red-600 hover:bg-red-50
            dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10
            transition-all duration-300"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle — desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-20 z-10 p-1.5 rounded-full
          bg-white dark:bg-slate-800
          border border-gray-200 dark:border-slate-700
          text-gray-500 dark:text-gray-400
          hover:text-gray-800 dark:hover:text-gray-200
          transition-colors shadow-md"
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5" />
          : <ChevronLeft  className="w-3.5 h-3.5" />
        }
      </button>
    </aside>
  );
};

export default Sidebar;