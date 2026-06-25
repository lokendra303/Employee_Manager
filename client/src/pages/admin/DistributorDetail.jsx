import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Alert, Badge, Icon, LoadingState, PageHeader, StatCard } from '../../components/ui';

const METHOD_LABELS = {
  CASH: 'Cash',
  UPI: 'UPI / Online',
  BANK: 'Bank Transfer',
  OTHER: 'Other',
};

export default function DistributorDetail({ distributorId }) {
  const [distributor, setDistributor] = useState(null);
  const [supervisors, setSupervisors] = useState([]);
  const [profileForm, setProfileForm] = useState({ name: '', contactPhone: '', contactEmail: '' });
  const [loginForm, setLoginForm] = useState({ name: '', email: '', password: '', isActive: true });
  const [linkUserId, setLinkUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingLogin, setSavingLogin] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [dRes, sRes] = await Promise.all([
        api.get(`/distributors/${distributorId}`),
        api.get('/reports/supervisors').catch(() => ({ data: [] })),
      ]);
      setDistributor(dRes.data);
      setProfileForm({
        name: dRes.data.name || '',
        contactPhone: dRes.data.contactPhone || '',
        contactEmail: dRes.data.contactEmail || '',
      });
      setLinkUserId(dRes.data.linkedUser?.id ? String(dRes.data.linkedUser.id) : '');
      if (dRes.data.linkedUser?.role === 'DISTRIBUTOR') {
        setLoginForm({
          name: dRes.data.linkedUser.name || '',
          email: dRes.data.linkedUser.email || '',
          password: '',
          isActive: dRes.data.linkedUser.isActive ?? true,
        });
      } else {
        setLoginForm({ name: '', email: '', password: '', isActive: true });
      }
      setSupervisors(sRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [distributorId]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError('');
    setMessage('');
    try {
      await api.put(`/distributors/${distributorId}`, {
        name: profileForm.name.trim(),
        contactPhone: profileForm.contactPhone.trim() || undefined,
        contactEmail: profileForm.contactEmail.trim() || '',
      });
      setMessage('Distributor profile updated');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const saveLogin = async (e) => {
    e.preventDefault();
    setSavingLogin(true);
    setError('');
    setMessage('');
    try {
      const hasDistributorLogin = distributor?.linkedUser?.role === 'DISTRIBUTOR';
      if (hasDistributorLogin) {
        const payload = {
          name: loginForm.name.trim(),
          email: loginForm.email.trim(),
          isActive: loginForm.isActive,
        };
        if (loginForm.password.trim()) {
          payload.password = loginForm.password;
        }
        await api.put(`/distributors/${distributorId}/login-account`, payload);
        setMessage('Distributor login updated');
        setLoginForm((f) => ({ ...f, password: '' }));
      } else {
        if (!loginForm.name.trim() || !loginForm.email.trim() || !loginForm.password.trim()) {
          setError('Name, login email, and password are required');
          setSavingLogin(false);
          return;
        }
        await api.post(`/distributors/${distributorId}/login-account`, {
          name: loginForm.name.trim(),
          email: loginForm.email.trim(),
          password: loginForm.password,
        });
        setMessage('Distributor login created');
        setLoginForm((f) => ({ ...f, password: '' }));
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingLogin(false);
    }
  };

  const saveLink = async () => {
    setSavingLink(true);
    setError('');
    setMessage('');
    try {
      await api.put(`/distributors/${distributorId}`, {
        userId: linkUserId ? Number(linkUserId) : null,
      });
      setMessage(linkUserId ? 'User linked to distributor' : 'User unlinked from distributor');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingLink(false);
    }
  };

  if (loading) return <LoadingState label="Loading distributor..." />;
  if (!distributor) return <Alert type="error">Distributor not found</Alert>;

  const linkableUsers = supervisors.filter(
    (s) => !s.id || s.id === distributor.linkedUser?.id || true
  );

  return (
    <div className="page-shell">
      <PageHeader
        badge="Distributor"
        title={distributor.name}
        subtitle="Edit profile, link login account, and view transactions"
        action={
          <Link to="/distributors" className="btn-secondary text-sm">
            ← All Distributors
          </Link>
        }
      />

      {message && <Alert type="success">{message}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={saveProfile} className="card space-y-4">
        <h3 className="font-semibold text-ink-900">Edit Distributor Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Distributor Name</label>
            <input
              className="input"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              value={profileForm.contactPhone}
              onChange={(e) => setProfileForm({ ...profileForm, contactPhone: e.target.value })}
              placeholder="Contact number"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={profileForm.contactEmail}
              onChange={(e) => setProfileForm({ ...profileForm, contactEmail: e.target.value })}
              placeholder="Optional contact email"
            />
          </div>
        </div>
        <button type="submit" className="btn-primary" disabled={savingProfile}>
          {savingProfile ? 'Saving...' : 'Save Distributor Profile'}
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Workers"
          value={distributor.workerCount}
          sub="Active under this distributor"
          variant="brand"
          icon={<Icon name="workers" className="w-5 h-5" />}
        />
        <StatCard
          label="Paid"
          value={`₹${distributor.totalPaid?.toLocaleString()}`}
          sub="Salary marked paid"
          variant="success"
          icon={<Icon name="check" className="w-5 h-5" />}
        />
        <StatCard
          label="Pending Payment"
          value={`₹${distributor.totalPending?.toLocaleString()}`}
          sub="Unpaid worker balance"
          variant="warning"
          icon={<Icon name="alert" className="w-5 h-5" />}
        />
        <StatCard
          label="Disbursed"
          value={`₹${distributor.totalDisbursed?.toLocaleString()}`}
          sub="Total payments recorded"
          variant="default"
          icon={<Icon name="banknote" className="w-5 h-5" />}
        />
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-ink-900">Distributor Login Account</h3>
        <p className="text-sm text-ink-500">
          Create email and password so this distributor can sign in to the mobile app or web portal,
          pay workers, and manage their wallet.
        </p>

        {distributor.linkedUser?.role === 'SUPERVISOR' ? (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-900">
            This distributor uses a <strong>supervisor</strong> login ({distributor.linkedUser.email}).
            Edit name, email, or password on the{' '}
            <Link to="/supervisors" className="font-semibold text-primary-700 hover:underline">
              Supervisors
            </Link>{' '}
            page.
          </div>
        ) : (
          <form onSubmit={saveLogin} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Display Name</label>
                <input
                  className="input"
                  value={loginForm.name}
                  onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                  placeholder="Name shown in app"
                  required
                />
              </div>
              <div>
                <label className="label">Login Email</label>
                <input
                  type="email"
                  className="input"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="distributor@company.com"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">
                  {distributor.linkedUser?.role === 'DISTRIBUTOR'
                    ? 'New Password (leave blank to keep current)'
                    : 'Password'}
                </label>
                <input
                  type="password"
                  className="input"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                  required={distributor.linkedUser?.role !== 'DISTRIBUTOR'}
                  minLength={loginForm.password ? 6 : undefined}
                />
              </div>
            </div>

            {distributor.linkedUser?.role === 'DISTRIBUTOR' && (
              <label className="flex items-center gap-3 p-3 rounded-xl border border-ink-200 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={loginForm.isActive}
                  onChange={(e) => setLoginForm({ ...loginForm, isActive: e.target.checked })}
                />
                <div>
                  <p className="text-sm font-semibold text-ink-900">Account active</p>
                  <p className="text-xs text-ink-500">Inactive accounts cannot sign in</p>
                </div>
              </label>
            )}

            <button type="submit" className="btn-primary" disabled={savingLogin}>
              {savingLogin
                ? 'Saving...'
                : distributor.linkedUser?.role === 'DISTRIBUTOR'
                  ? 'Save Login'
                  : 'Create Login Account'}
            </button>
          </form>
        )}
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-ink-900">Link Existing Supervisor (optional)</h3>
        <p className="text-sm text-ink-500">
          Alternatively, link an existing supervisor so they can also act as this distributor.
          A supervisor keeps supervisor access plus distributor wallet/payments.
        </p>

        {distributor.linkedUser ? (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-primary-50 border border-primary-100">
            <span className="font-semibold text-ink-900">{distributor.linkedUser.name}</span>
            <span className="text-sm text-ink-500">{distributor.linkedUser.email}</span>
            <Badge tone={distributor.linkedUser.isSupervisorDistributor ? 'warning' : 'brand'}>
              {distributor.linkedUser.isSupervisorDistributor ? 'Supervisor + Distributor' : distributor.linkedUser.role}
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            No login linked — only admin can record payments for this distributor until a user is linked.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="label">Link supervisor / distributor user</label>
            <select
              className="input"
              value={linkUserId}
              onChange={(e) => setLinkUserId(e.target.value)}
            >
              <option value="">— No linked user —</option>
              {linkableUsers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email}) — Supervisor
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn-primary" onClick={saveLink} disabled={savingLink}>
            {savingLink ? 'Saving...' : 'Save Link'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-ink-900 mb-3">Workers ({distributor.workers?.length || 0})</h3>
        {!distributor.workers?.length ? (
          <p className="text-sm text-ink-500 py-4 text-center">No workers assigned to this distributor</p>
        ) : (
          <div className="rounded-xl border border-ink-100 divide-y divide-ink-100">
            {distributor.workers.map((w) => (
              <div key={w.id} className="flex justify-between items-center px-4 py-3 text-sm">
                <Link to={`/workers/${w.id}`} className="font-semibold text-primary-700 hover:underline">
                  {w.name}
                </Link>
                <span className="text-ink-500">₹{w.dailyRate}/day</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 flex justify-between items-center">
          <h3 className="font-semibold text-ink-900">Payment Transactions</h3>
          <Link to={`/transactions?distributorId=${distributorId}`} className="text-sm text-primary-600 font-semibold">
            View all →
          </Link>
        </div>
        {!distributor.transactions?.length ? (
          <p className="text-sm text-ink-500 text-center py-10">No transactions yet</p>
        ) : (
          <div className="divide-y divide-ink-50">
            {distributor.transactions.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={t.type === 'DISBURSEMENT' ? 'danger' : 'success'}>
                      {t.type.replace('_', ' ')}
                    </Badge>
                    <span className="font-semibold text-sm">{t.worker?.name || '—'}</span>
                  </div>
                  {t.createdBy && (
                    <p className="text-xs text-ink-500 mt-1">
                      By {t.createdBy.name} ({t.createdBy.role})
                    </p>
                  )}
                  {t.paymentMethod && (
                    <p className="text-xs text-ink-400">{METHOD_LABELS[t.paymentMethod] || t.paymentMethod}</p>
                  )}
                  {t.notes && <p className="text-xs text-ink-400 mt-1 line-clamp-2">{t.notes}</p>}
                  <p className="text-[11px] text-ink-400 mt-1">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <span className={`font-bold tabular-nums shrink-0 ${t.type === 'DISBURSEMENT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {t.type === 'DISBURSEMENT' ? '−' : '+'}₹{t.amount?.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
