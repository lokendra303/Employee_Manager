import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Icon } from '../components/ui';
import { normalizeApiUrl, testApiConnection } from '../utils/apiUrl';

export default function SystemAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [error, setError] = useState('');
  const { user, login, loading, logout, bootstrapping } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/public/config').then((res) => {
      if (res?.data?.apiBaseUrl) setApiUrl(res.data.apiBaseUrl);
    }).catch(() => {});
  }, []);

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
        Loading...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const normalized = normalizeApiUrl(apiUrl);
      await testApiConnection(normalized);

      const loggedInUser = await login(email, password);
      if (loggedInUser?.role !== 'SYSTEM_ADMIN') {
        logout();
        setError('This page is for system administrators only');
        return;
      }
      await api.put('/system/settings/api-url', { apiBaseUrl: normalized });
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
            <Icon name="building" className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white">System Administrator</p>
            <p className="text-xs text-slate-400">Configure API for all devices</p>
          </div>
        </div>

        <div className="card-elevated p-6 sm:p-8 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex gap-2 items-start bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm">
                <Icon name="alert" className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="label">Global API URL</label>
              <input
                type="url"
                className="input"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://your-server.com/api/v1"
                required
              />
              <p className="text-xs text-ink-500 mt-1">
                Saved on the server — all mobile apps will use this URL automatically.
              </p>
            </div>

            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="system@attendance.com"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Save API & sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-500 mt-6">
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">
              Back to organization login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
