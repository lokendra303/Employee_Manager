import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

function PaymentProgress({ paid, unpaid }) {
  const total = (paid || 0) + (unpaid || 0);
  if (!total) {
    return <p className="text-xs text-ink-400">No salary recorded yet</p>;
  }
  const pct = Math.min(100, Math.round((paid / total) * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-ink-500">Salary settled</span>
        <span className="font-bold text-emerald-700">{pct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-ink-400">
        <span>{formatMoney(paid)} paid</span>
        <span>{formatMoney(unpaid)} due</span>
      </div>
    </div>
  );
}

function WorkerCard({ worker: w, onEdit, onDeactivate, onReactivate }) {
  const att = w.monthAttendance || { present: 0, halfDay: 0, absent: 0 };
  const attTotal = att.present + att.halfDay + att.absent;

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-ink-100/80 bg-white shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 ${
        w.status === 'INACTIVE' ? 'opacity-80' : ''
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-teal-400 opacity-90" />

      <div className="p-5 flex flex-col gap-4 h-full">
        <div className="flex items-start gap-3">
          <Avatar name={w.name} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/workers/${w.id}`}
                className="font-bold text-lg text-ink-900 group-hover:text-primary-700 truncate transition-colors"
              >
                {w.name}
              </Link>
              <Badge tone={w.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {w.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-sm text-ink-500 mt-0.5 flex items-center gap-1.5">
              <Icon name="briefcase" className="w-3.5 h-3.5 shrink-0" />
              {w.distributor?.name || '—'}
            </p>
            {w.phone && (
              <p className="text-xs text-ink-400 mt-1 flex items-center gap-1.5">
                <Icon name="phone" className="w-3.5 h-3.5 shrink-0" />
                {w.phone}
              </p>
            )}
          </div>
        </div>

        <PaymentProgress paid={w.totalPaid} unpaid={w.unpaidBalance} />

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/80 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Paid</p>
            <p className="text-lg font-bold text-emerald-800 tabular-nums mt-0.5">{formatMoney(w.totalPaid)}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-100/80 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Due</p>
            <p className="text-lg font-bold text-amber-800 tabular-nums mt-0.5">{formatMoney(w.unpaidBalance)}</p>
          </div>
        </div>

        <div className="rounded-xl bg-ink-50/80 border border-ink-100 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">This month</p>
            {attTotal > 0 && (
              <span className="text-[10px] font-semibold text-ink-400">{attTotal} days marked</span>
            )}
          </div>
          <AttendanceMiniBar monthAttendance={w.monthAttendance} />
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="chip bg-primary-50 text-primary-700 border border-primary-100">
            ₹{w.dailyRate}/day
          </span>
          <span className="chip bg-ink-50 text-ink-600 border border-ink-100">
            Every {w.payoutIntervalDays}d
          </span>
        </div>

        <div className="flex gap-2 mt-auto pt-1">
          <Link
            to={`/workers/${w.id}`}
            className="btn-primary flex-1 text-sm text-center justify-center inline-flex items-center gap-1.5"
          >
            <Icon name="list" className="w-4 h-4" />
            History
          </Link>
          <button type="button" className="btn-secondary flex-1 text-sm" onClick={() => onEdit(w)}>
            Edit
          </button>
        </div>

        {w.status === 'ACTIVE' ? (
          <button
            type="button"
            className="text-xs text-rose-600 font-semibold hover:underline text-center"
            onClick={() => onDeactivate(w)}
          >
            Deactivate worker
          </button>
        ) : (
          <button
            type="button"
            className="text-xs text-emerald-600 font-semibold hover:underline text-center"
            onClick={() => onReactivate(w)}
          >
            Reactivate worker
          </button>
        )}
      </div>
    </article>
  );
}

export default function Workers() {
  const [searchParams, setSearchParams] = useSearchParams();
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

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

      {distributors.length === 0 && (
        <Alert type="warning">
          Add a <Link to="/distributors?add=1" className="font-semibold underline">project / site</Link> first,
          then you can assign workers to it.
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/workers?add=1"
          className="card-elevated flex items-center gap-4 p-4 hover:border-primary-200 transition group"
          onClick={(e) => {
            e.preventDefault();
            setShowForm(true);
          }}
        >
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition">
            <Icon name="workers" className="w-6 h-6 text-primary-700" />
          </div>
          <div>
            <p className="font-bold text-ink-900">Add Worker</p>
            <p className="text-xs text-ink-500">Register employee with daily rate & pay cycle</p>
          </div>
        </Link>
        <Link to="/distributors?add=1" className="card-elevated flex items-center gap-4 p-4 hover:border-primary-200 transition group">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition">
            <Icon name="briefcase" className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <p className="font-bold text-ink-900">Add Project / Site</p>
            <p className="text-xs text-ink-500">Job site where workers are assigned</p>
          </div>
        </Link>
      </div>

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
        <div className="relative sm:max-w-xs w-full">
          <Icon name="workers" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input
            className="input pl-10 w-full"
            placeholder="Search name, distributor, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
              <label className="label">Project / Site</label>
              <select className="input" value={form.distributorId} onChange={(e) => setForm({ ...form, distributorId: e.target.value })} required>
                <option value="">Select project / site</option>
                {distributors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {!distributors.length && (
                <p className="text-xs text-amber-700 mt-1">
                  <Link to="/distributors?add=1" className="underline font-semibold">Create a project</Link> first
                </p>
              )}
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
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredWorkers.map((w) => (
            <WorkerCard
              key={w.id}
              worker={w}
              onEdit={startEdit}
              onDeactivate={deactivate}
              onReactivate={reactivate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
