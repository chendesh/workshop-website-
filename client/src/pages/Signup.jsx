import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Signup() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = { ...formData, username: formData.username.trim().toLowerCase() };
      const res = await api.post('/auth/signup', submitData);
      toast.success(res.data.message);
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8">
        <h2 className="text-3xl font-outfit font-bold text-slate-100 text-center mb-8">Owner Setup</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
            <input
              type="text"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:border-amber-500"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
            <input
              type="text"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:border-amber-500"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:border-amber-500"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Setting up...' : 'Create Owner Account'}
          </button>
        </form>
        <div className="mt-4 text-center">
            <Link to="/login" className="text-amber-500 hover:underline">Already have an account? Login</Link>
        </div>
      </div>
    </div>
  );
}
