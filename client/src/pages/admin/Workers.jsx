import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

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

function StatusBadge({ status }) {
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${
        status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {status === 'ACTIVE' ? 'Active' : 'Inactive'}
    </span>
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

  const activeCount = workers.filter((w) => w.status === 'ACTIVE').length;
  const inactiveCount = workers.filter((w) => w.status === 'INACTIVE').length;

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Workers</h2>
          <p className="text-sm text-gray-500 mt-1">
            Active workers appear in attendance & payments. Inactive workers are kept for records only.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setForm(emptyForm);
          }}
        >
          {showForm ? 'Cancel' : '+ Add Worker'}
        </button>
      </div>

      {message && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] ${
              statusFilter === f.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.label}
            {f.value === 'ACTIVE' && statusFilter === '' && activeCount > 0 && (
              <span className="ml-1 opacity-80">({activeCount})</span>
            )}
            {f.value === 'INACTIVE' && statusFilter === '' && inactiveCount > 0 && (
              <span className="ml-1 opacity-80">({inactiveCount})</span>
            )}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="font-semibold">{editingId ? 'Edit Worker' : 'New Worker'}</h3>

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

      {workers.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">No workers found</div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {workers.map((w) => (
              <div key={w.id} className={`card ${w.status === 'INACTIVE' ? 'opacity-75' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <Link to={`/workers/${w.id}`} className="font-semibold text-primary-700 hover:underline">
                      {w.name}
                    </Link>
                    <p className="text-sm text-gray-500">{w.distributor?.name}</p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Daily:</span> ₹{w.dailyRate}</div>
                  <div><span className="text-gray-500">Pay cycle:</span> {w.payoutIntervalDays}d</div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Period: {w.currentPeriod?.start} → {w.currentPeriod?.end}
                </p>
                <div className="flex gap-2 mt-3">
                  <button className="btn-secondary flex-1" onClick={() => startEdit(w)}>Edit</button>
                  {w.status === 'ACTIVE' ? (
                    <button className="btn-danger flex-1" onClick={() => deactivate(w)}>Deactivate</button>
                  ) : (
                    <button className="btn-primary flex-1" onClick={() => reactivate(w)}>Reactivate</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Daily Rate</th>
                  <th className="pb-3 pr-4">Pay Cycle</th>
                  <th className="pb-3 pr-4">Distributor</th>
                  <th className="pb-3 pr-4">Current Period</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.id} className={`border-b last:border-0 ${w.status === 'INACTIVE' ? 'opacity-60' : ''}`}>
                    <td className="py-3 pr-4 font-medium">
                      <Link to={`/workers/${w.id}`} className="text-primary-700 hover:underline">
                        {w.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4"><StatusBadge status={w.status} /></td>
                    <td className="py-3 pr-4">₹{w.dailyRate}</td>
                    <td className="py-3 pr-4">Every {w.payoutIntervalDays} days</td>
                    <td className="py-3 pr-4">{w.distributor?.name}</td>
                    <td className="py-3 pr-4 text-gray-500">{w.currentPeriod?.start} → {w.currentPeriod?.end}</td>
                    <td className="py-3 space-x-2 whitespace-nowrap">
                      <button className="text-primary-600 hover:underline" onClick={() => startEdit(w)}>Edit</button>
                      {w.status === 'ACTIVE' ? (
                        <button className="text-red-600 hover:underline" onClick={() => deactivate(w)}>Deactivate</button>
                      ) : (
                        <button className="text-green-600 hover:underline" onClick={() => reactivate(w)}>Reactivate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
