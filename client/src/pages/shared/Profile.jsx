import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Alert, Avatar, LoadingState, PageHeader } from '../../components/ui';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', currentPassword: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        setForm((f) => ({
          ...f,
          name: res.data.name || '',
          email: res.data.email || '',
        }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
      };
      if (form.password.trim()) {
        payload.password = form.password;
        payload.currentPassword = form.currentPassword;
      }
      const res = await api.put('/auth/profile', payload);
      localStorage.setItem('token', res.data.token);
      updateUser(res.data.user);
      setForm((f) => ({ ...f, currentPassword: '', password: '' }));
      setMessage('Profile updated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading profile..." />;

  const roleLabel = user?.role?.replace(/_/g, ' ');

  return (
    <div className="page-shell max-w-2xl">
      <PageHeader
        badge="Account"
        title="My Profile"
        subtitle="Update your name, login email, and password."
      />

      {message && <Alert type="success">{message}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={saveProfile} className="card space-y-5">
        <div className="flex items-center gap-4 pb-4 border-b border-ink-100">
          <Avatar name={form.name || user?.name} size="lg" />
          <div>
            <p className="font-semibold text-ink-900">{form.name || user?.name}</p>
            <p className="text-sm text-ink-500">{form.email || user?.email}</p>
            {user?.organizationName && (
              <p className="text-xs text-ink-400 mt-1">{user.organizationName}</p>
            )}
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider bg-primary-100 text-primary-700 px-2 py-1 rounded-md">
              {roleLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Full Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Email (login)</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="pt-2 border-t border-ink-100 space-y-4">
          <h3 className="font-semibold text-ink-900">Change Password</h3>
          <p className="text-sm text-ink-500">Leave blank to keep your current password.</p>
          <div>
            <label className="label">Current Password</label>
            <input
              className="input"
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              placeholder="Required only when setting a new password"
              minLength={form.password ? 1 : undefined}
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters"
              minLength={form.password ? 6 : undefined}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
