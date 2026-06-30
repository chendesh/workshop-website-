import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Bell, Phone, MapPin, Truck, Clock, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function WorkRequests() {
  const [requests, setRequests] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ Safe notification function — works on both mobile and desktop
  const sendNotification = (title, body) => {
    try {
      if (!('Notification' in window)) return; // browser doesn't support notifications
      if (Notification.permission !== 'granted') return; // permission not given

      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        // ✅ Mobile — use service worker
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body,
            icon: '/vite.svg'
          });
        }).catch(err => console.log('SW notification failed:', err));
      } else {
        // ✅ Desktop — use regular Notification
        new Notification(title, {
          body,
          icon: '/vite.svg'
        });
      }
    } catch (err) {
      // ✅ Silently fail — never crash the app
      console.log('Notification not supported on this device:', err);
    }
  };

  useEffect(() => {
    // ✅ Safe permission request — checks support first
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const q = query(collection(db, 'workRequests'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate unread count
      const currentUnread = newRequests.filter(req => !req.read).length;

      // If unread count goes up, send a notification
      setUnreadCount((prev) => {
        if (currentUnread > prev) {
          const newestUnread = newRequests.find(req => !req.read);
          if (newestUnread) {
            sendNotification(
              'New Work Request',
              `${newestUnread.customerName}: ${newestUnread.workDescription.substring(0, 50)}...`
            );
          }
        }
        return currentUnread;
      });

      setRequests(newRequests);
    }, (error) => {
      console.error("Error fetching work requests:", error);
      toast.error("Failed to sync work requests");
    });

    return () => unsubscribe();
  }, []);

  const handleMarkAsRead = async (id, currentReadStatus) => {
    if (!currentReadStatus) {
      try {
        await updateDoc(doc(db, 'workRequests', id), {
          read: true
        });
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    }
  };

  const handleUpdateStatus = async (e, id, newStatus) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'workRequests', id), {
        status: newStatus,
        read: true
      });
      toast.success(`Request ${newStatus} successfully`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-inter text-slate-100 min-h-full">
      <div className="flex items-center gap-4 mb-8">
        <div className="relative">
          <Bell className={`w-8 h-8 ${unreadCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[10px] items-center justify-center font-bold text-slate-900">
                {unreadCount}
              </span>
            </span>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-outfit font-bold text-slate-800 dark:text-slate-100">Work Requests</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage incoming service requests from customers.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {requests.length === 0 ? (
          <div className="text-center py-12 bg-slate-800 rounded-2xl border border-slate-700">
            <p className="text-slate-400 text-lg">No work requests yet.</p>
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              onClick={() => handleMarkAsRead(request.id, request.read)}
              className={`bg-slate-800 rounded-2xl border transition-all duration-300 p-6 cursor-pointer ${
                !request.read
                  ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold font-outfit">{request.customerName}</h2>
                    {!request.read && (
                      <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-md">
                        NEW
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getStatusColor(request.status)} capitalize`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{request.customerEmail}</p>
                </div>

                {request.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleUpdateStatus(e, request.id, 'approved')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-colors border border-green-500/20 font-medium text-sm"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={(e) => handleUpdateStatus(e, request.id, 'rejected')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20 font-medium text-sm"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-sm">
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="p-2 bg-slate-900 rounded-lg text-amber-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span>{request.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="p-2 bg-slate-900 rounded-lg text-amber-500">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="truncate" title={request.location}>{request.location}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="p-2 bg-slate-900 rounded-lg text-amber-500">
                    <Truck className="w-4 h-4" />
                  </div>
                  <span>{request.vehicleDetails || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="p-2 bg-slate-900 rounded-lg text-amber-500">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span>{request.preferredDate}</span>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-4 border border-slate-700/50">
                <p className="text-slate-300 text-sm leading-relaxed">
                  {request.workDescription}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}