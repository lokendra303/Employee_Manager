import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  Alert,
  Avatar,
  Badge,
  EmptyState,
  Icon,
  LoadingState,
  PageHeader,
  StatCard,
} from '../../components/ui';

const emptyForm = {
  name: '',
  phone: '',
  dailyRate: '',
  payoutIntervalDays: 7,
  payCycleAnchor: new Date().toISOString().slice(0, 10),
  distributorId: '',
  status: 'ACTIVE',
};

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

function formatMoney(value) {
  return `₹${(Number(value) || 0).toLocaleString()}`;
}

function AttendanceMiniBar({ monthAttendance }) {
  const present = monthAttendance?.present || 0;
  const halfDay = monthAttendance?.halfDay || 0;
  const absent = monthAttendance?.absent || 0;
  const total = present + halfDay + absent;

  if (!total) {
    return <p className="text-xs text-ink-400">No attendance this month</p>;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden bg-ink-100">
        {present > 0 && (
          <div className="bg-emerald-500" style={{ width: `${(present / total) * 100}%` }} title={`${present} present`} />
        )}
        {halfDay > 0 && (
          <div className="bg-amber-400" style={{ width: `${(halfDay / total) * 100}%` }} title={`${halfDay} half day`} />
        )}
        {absent > 0 && (
          <div className="bg-rose-400" style={{ width: `${(absent / total) * 100}%` }} title={`${absent} absent`} />
        )}
      </div>
      <p className="text-[11px] text-ink-500">
        {present}P · {halfDay}½ · {absent}A this month
      </p>
    </div>
  );
}

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const query = statusFilter ? `?status=${statusFilter}` : '';
      const [wRes, dRes] = await Promise.all([
        api.get(`/workers${query}`),
        api.get('/distributors'),
      ]);
      setWorkers(wRes.data);
      setDistributors(dRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [statusFilter]);

  const filteredWorkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workers;
    return workers.filter(
      (w) =>
        w.name?.toLowerCase().includes(q) ||
        w.distributor?.name?.toLowerCase().includes(q) ||
        w.phone?.includes(q)
    );
  }, [workers, search]);

  const totals = useMemo(() => {
    return workers.reduce(
      (acc, w) => ({
        unpaid: acc.unpaid + (w.unpaidBalance || 0),
        paid: acc.paid + (w.totalPaid || 0),
        active: acc.active + (w.status === 'ACTIVE' ? 1 : 0),
      }),
      { unpaid: 0, paid: 0, active: 0 }
    );
  }, [workers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const payload = {
      ...form,
      dailyRate: Number(form.dailyRate),
      payoutIntervalDays: Number(form.payoutIntervalDays),
      distributorId: Number(form.distributorId),
      status: form.status,
    };

    try {
      if (editingId) {
        await api.put(`/workers/${editingId}`, payload);
        setMessage('Worker updated');
      } else {
        await api.post('/workers', payload);
        setMessage('Worker created');
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (worker) => {
    setForm({
      name: worker.name,
      phone: worker.phone || '',
      dailyRate: worker.dailyRate,
      payoutIntervalDays: worker.payoutIntervalDays,
      payCycleAnchor: worker.payCycleAnchor,
      distributorId: worker.distributorId,
      status: worker.status,
    });
    setEditingId(worker.id);
    setShowForm(true);
    setError('');
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const deactivate = async (worker) => {
    if (!window.confirm(`Deactivate ${worker.name}? They will be hidden from attendance and payments.`)) return;
    setError('');
    try {
      await api.delete(`/workers/${worker.id}`);
      setMessage(`${worker.name} marked inactive`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const reactivate = async (worker) => {
    setError('');
    try {
      await api.post(`/workers/${worker.id}/reactivate`);
      setMessage(`${worker.name} reactivated`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <LoadingState label="Loading workers..." />;

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        badge="Workforce"
        title="Workers"
        subtitle="Track daily rates, pay cycles, attendance, and salary balances for every worker."
        action={
          <button type="button" className="btn-primary" onClick={() => (showForm ? closeForm() : setShowForm(true))}>
            <Icon name="workers" className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Add Worker'}
          </button>
        }
      />

      {message && <Alert type="success">{message}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Active Workers"
          value={totals.active}
          sub={`${workers.length} total in list`}
          variant="brand"
          icon={<Icon name="workers" className="w-5 h-5" />}
        />
        <StatCard
          label="Total Paid"
          value={formatMoney(totals.paid)}
          sub="Lifetime salary marked paid"
          variant="success"
          icon={<Icon name="check" className="w-5 h-5" />}
        />
        <StatCard
          label="Unpaid Balance"
          value={formatMoney(totals.unpaid)}
          sub="Accrued, not yet paid"
          variant="warning"
          icon={<Icon name="banknote" className="w-5 h-5" />}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                statusFilter === f.value
                  ? 'bg-primary-600 text-white shadow-soft'
                  : 'bg-white border border-ink-200 text-ink-600 hover:border-primary-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="input sm:max-w-xs"
          placeholder="Search name, distributor, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 animate-fade-in">
          <h3 className="font-semibold text-ink-900">{editingId ? 'Edit Worker' : 'New Worker'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Daily Rate (₹)</label>
              <input type="number" className="input" value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: e.target.value })} required min="1" />
            </div>
            <div>
              <label className="label">Pay Every (days)</label>
              <select className="input" value={form.payoutIntervalDays} onChange={(e) => setForm({ ...form, payoutIntervalDays: e.target.value })}>
                <option value={2}>2 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
            <div>
              <label className="label">Cycle Start Date</label>
              <input type="date" className="input" value={form.payCycleAnchor} onChange={(e) => setForm({ ...form, payCycleAnchor: e.target.value })} required />
            </div>
            <div>
              <label className="label">Distributor</label>
              <select className="input" value={form.distributorId} onChange={(e) => setForm({ ...form, distributorId: e.target.value })} required>
                <option value="">Select distributor</option>
                {distributors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            {editingId && (
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            )}
          </div>
          <button type="submit" className="btn-primary w-full sm:w-auto">
            {editingId ? 'Update Worker' : 'Create Worker'}
          </button>
        </form>
      )}

      {filteredWorkers.length === 0 ? (
        <EmptyState title="No workers found" description="Add a worker or adjust your filters." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredWorkers.map((w) => (
            <div
              key={w.id}
              className={`card-elevated flex flex-col gap-4 ${w.status === 'INACTIVE' ? 'opacity-75' : ''}`}
            >
              <div className="flex items-start gap-3">
                <Avatar name={w.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/workers/${w.id}`} className="font-bold text-lg text-ink-900 hover:text-primary-700 truncate">
                      {w.name}
                    </Link>
                    <Badge tone={w.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {w.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-ink-500 mt-0.5">{w.distributor?.name || '—'}</p>
                  {w.phone && <p className="text-xs text-ink-400 mt-0.5">{w.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Paid</p>
                  <p className="font-bold text-emerald-800 tabular-nums mt-1">{formatMoney(w.totalPaid)}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Remaining</p>
                  <p className="font-bold text-amber-800 tabular-nums mt-1">{formatMoney(w.unpaidBalance)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">This Month</p>
                <AttendanceMiniBar monthAttendance={w.monthAttendance} />
              </div>

              <div className="pt-3 border-t border-ink-100 grid grid-cols-2 gap-2 text-xs text-ink-500">
                <span>₹{w.dailyRate}/day</span>
                <span className="text-right">Pay every {w.payoutIntervalDays}d</span>
                <span className="col-span-2 text-ink-400">
                  Period {w.currentPeriod?.start} → {w.currentPeriod?.end}
                </span>
              </div>

              <div className="flex gap-2 mt-auto">
                <Link to={`/workers/${w.id}`} className="btn-primary flex-1 text-sm text-center">
                  View History
                </Link>
                <button type="button" className="btn-secondary flex-1 text-sm" onClick={() => startEdit(w)}>
                  Edit
                </button>
              </div>
              {w.status === 'ACTIVE' ? (
                <button type="button" className="text-xs text-rose-600 font-semibold hover:underline" onClick={() => deactivate(w)}>
                  Deactivate worker
                </button>
              ) : (
                <button type="button" className="text-xs text-emerald-600 font-semibold hover:underline" onClick={() => reactivate(w)}>
                  Reactivate worker
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
