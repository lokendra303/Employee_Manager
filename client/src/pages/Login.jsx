import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { user, login, loading, bootstrapping } = useAuth();
  const navigate = useNavigate();

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-500">
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
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-md animate-fade-in-up">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-glow mb-8 animate-scale-in">
            <Icon name="calendar" className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Workforce pay,<br />
            <span className="text-primary-300">done right.</span>
          </h1>
          <p className="text-ink-300 mt-4 text-lg leading-relaxed">
            Track attendance, manage pay cycles, and disburse salaries with full audit trails.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {['Day-based pay', 'Wallet tracking', 'Fund requests', 'Role-based access'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-ink-300">
                <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <Icon name="check" className="w-3 h-3 text-primary-400" />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Icon name="calendar" className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-ink-900">Attendance Manager</p>
              <p className="text-xs text-ink-500">Sign in to continue</p>
            </div>
          </div>

          <div className="card-elevated p-6 sm:p-8 animate-fade-in-up stagger-2">
            <h2 className="text-2xl font-bold text-ink-900 hidden lg:block">Welcome back</h2>
            <p className="text-ink-500 mt-1 hidden lg:block text-sm mb-6">Enter your credentials to access your dashboard</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex gap-2 items-start bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm">
                  <Icon name="alert" className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
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
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-sm text-ink-500 mt-6">
              New organization?{' '}
              <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700">
                Register here
              </Link>
            </p>

            <p className="text-center text-sm text-ink-500 mt-3">
              <Link to="/system-login" className="text-ink-600 font-medium hover:text-ink-800">
                System administrator sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
