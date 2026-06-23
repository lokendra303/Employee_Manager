import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

const emptyForm = {
  organizationName: '',
  contactPhone: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

export default function RegisterOrganization() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register-organization', form);
      setSuccess(res.data.message);
      setForm(emptyForm);
      setTimeout(() => navigate('/login'), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-primary-50 to-gray-50">
      <div className="card w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary-700">Register Organization</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Create your organization account. A system administrator will approve it before you can log in.
          </p>
        </div>

        {success && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{success}</div>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Organization Name</label>
            <input
              className="input"
              value={form.organizationName}
              onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Contact Phone</label>
            <input
              className="input"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            />
          </div>
          <hr className="border-gray-100" />
          <p className="text-sm font-medium text-gray-700">Organization Admin (you)</p>
          <div>
            <label className="label">Your Name</label>
            <input
              className="input"
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Email (login)</label>
            <input
              type="email"
              className="input"
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={form.adminPassword}
              onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
              minLength={6}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already approved? <Link to="/login" className="text-primary-600 hover:underline">Sign in</Link>
        </p>
        <p className="text-center text-xs text-gray-400 mt-2">
          Supervisors cannot register directly. Your organization admin adds them after approval.
        </p>
      </div>
    </div>
  );
}
