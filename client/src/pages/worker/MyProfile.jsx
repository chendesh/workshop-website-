import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { User } from 'lucide-react';
import RupeeDisplay from '../../components/RupeeDisplay';

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setProfile(res.data.data.workerProfile);
    } catch (error) {
      toast.error('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-slate-400">Loading profile...</div>;
  if (!profile) return <div className="text-center py-8 text-slate-400">Profile not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-outfit text-slate-100">My Profile</h1>
        <p className="text-slate-400">Your personal and employment details.</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-2xl">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-700">
          <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center overflow-hidden">
             {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
             ) : (
                <User className="w-12 h-12 text-slate-400" />
             )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">{profile.fullName}</h2>
            <p className="text-amber-500 font-medium">{profile.designation}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Phone Number</label>
            <div className="text-slate-100 font-medium bg-slate-900 px-4 py-3 rounded-lg border border-slate-700">
              {profile.phone || 'N/A'}
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Daily Wage Rate</label>
            <div className="text-slate-100 font-medium bg-slate-900 px-4 py-3 rounded-lg border border-slate-700">
              <RupeeDisplay amount={profile.dailyRate} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Join Date</label>
            <div className="text-slate-100 font-medium bg-slate-900 px-4 py-3 rounded-lg border border-slate-700">
              {profile.joinDate ? new Date(profile.joinDate).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Status</label>
            <div className="text-slate-100 font-medium bg-slate-900 px-4 py-3 rounded-lg border border-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Active
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-700">
            <p className="text-sm text-slate-400 text-center">
                Contact the owner if any of these details need to be updated.
            </p>
        </div>
      </div>
    </div>
  );
}
