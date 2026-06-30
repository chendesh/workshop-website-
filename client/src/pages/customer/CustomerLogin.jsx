import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { toast } from 'react-hot-toast';
import { Hammer } from 'lucide-react';

// ── Firebase error codes that mean WRONG CREDENTIALS (never retry these) ──
const CREDENTIAL_ERRORS = new Set([
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-credential',     // Firebase v9+ combines wrong-password + user-not-found
  'auth/invalid-email',
  'auth/user-disabled',
]);

// ── Firebase error codes that are NETWORK/TIMING issues (safe to retry) ──
const RETRYABLE_ERRORS = new Set([
  'auth/network-request-failed',
  'auth/timeout',
  'auth/internal-error',
  'auth/too-many-requests',      // retry after longer delay
]);

const getErrorMessage = (error) => {
  // Wrong credentials — clear user-facing message, no retry
  if (CREDENTIAL_ERRORS.has(error.code)) {
    return 'Invalid email or password. Please check and try again.';
  }
  // Account issues
  if (error.code === 'auth/user-disabled') {
    return 'This account has been disabled. Please contact support.';
  }
  if (error.code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  // Wrong role
  if (error.message === 'not-customer') {
    return 'No customer account found with these credentials.';
  }
  // Network/Firestore timeouts — return null to signal "retry"
  if (RETRYABLE_ERRORS.has(error.code) || !error.code) {
    return null;
  }
  return 'Login failed. Please check your connection and try again.';
};

export default function CustomerLogin() {
  const [formData, setFormData]   = useState({ email: '', password: '' });
  const [loading, setLoading]     = useState(false);
  const [retrying, setRetrying]   = useState(false);
  const { customerLogin }         = useCustomerAuth();
  const navigate                  = useNavigate();

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const attemptLogin = async (retryCount = 0) => {
    try {
      setLoading(true);
      setRetrying(false);
      await customerLogin(formData.email, formData.password);
      toast.success('Welcome back!');
      navigate('/customer/dashboard');

    } catch (error) {
      console.error(`Login attempt ${retryCount + 1} failed:`, error.code, error.message);
      const errorMessage = getErrorMessage(error);

      if (errorMessage) {
        // ── Definitive error — wrong password, disabled account etc.
        // Do NOT retry. Show message immediately.
        toast.error(errorMessage);
        setLoading(false);
        setRetrying(false);

      } else if (retryCount < 2) {
        // ── Network / Firestore timeout — wait then retry
        // 8 seconds gives Firebase time to fully establish connection on mobile
        setRetrying(true);
        toast.loading(
          retryCount === 0
            ? 'Connecting to server, please wait...'
            : 'Still connecting, one more try...',
          { id: 'retry-toast' }
        );
        await sleep(8000);
        toast.dismiss('retry-toast');
        attemptLogin(retryCount + 1);

      } else {
        // ── Max retries reached
        toast.dismiss('retry-toast');
        toast.error('Connection failed. Please check your internet and try again.');
        setLoading(false);
        setRetrying(false);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    attemptLogin();
  };

  const buttonLabel = retrying ? 'Retrying...' : loading ? 'Logging in...' : 'Login';

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-inter">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 relative z-10">

        <div className="flex justify-center mb-8">
          <Link to="/">
            <div className="bg-amber-500 p-3 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Hammer className="w-6 h-6 text-slate-900" />
            </div>
          </Link>
        </div>

        <h2 className="text-2xl font-bold text-slate-100 text-center mb-2 font-outfit">
          Welcome Back
        </h2>
        <p className="text-slate-400 text-center mb-8">
          Log in to manage your work requests
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              disabled={loading || retrying}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl
                         text-slate-100 placeholder-slate-500
                         focus:outline-none focus:ring-2 focus:ring-amber-500
                         focus:border-transparent transition-all disabled:opacity-50"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              disabled={loading || retrying}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl
                         text-slate-100 placeholder-slate-500
                         focus:outline-none focus:ring-2 focus:ring-amber-500
                         focus:border-transparent transition-all disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || retrying}
            className="w-full py-3 mt-6 bg-amber-500 hover:bg-amber-600 text-slate-900
                       rounded-xl font-semibold transition-all duration-300
                       shadow-[0_0_15px_rgba(245,158,11,0.2)]
                       hover:shadow-[0_0_25px_rgba(245,158,11,0.4)]
                       disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {buttonLabel}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-slate-400">
            Don't have an account?{' '}
            <Link
              to="/customer/signup"
              className="text-amber-500 hover:text-amber-400 font-medium transition-colors"
            >
              Sign up here
            </Link>
          </p>
          <p className="text-sm">
            <Link to="/" className="text-slate-500 hover:text-slate-400 transition-colors">
              Return to Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}