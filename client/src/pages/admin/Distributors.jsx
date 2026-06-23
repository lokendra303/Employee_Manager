import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { Alert, Badge, Icon, PageHeader } from '../../components/ui';

const emptyForm = { name: '', contactPhone: '', contactEmail: '', openingBalance: 0, userId: '' };
const emptyEditForm = { name: '', contactPhone: '', contactEmail: '' };

export default function Distributors() {
  const navigate = useNavigate();
  const [distributors, setDistributors] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    try {
      const [dRes, sRes] = await Promise.all([
        api.get('/distributors'),
        api.get('/reports/supervisors').catch(() => ({ data: [] })),
      ]);
      setDistributors(dRes.data);
      setSupervisors(sRes.data);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/distributors', {
        name: form.name,
        contactPhone: form.contactPhone || undefined,
        contactEmail: form.contactEmail || undefined,
        openingBalance: Number(form.openingBalance) || 0,
        userId: form.userId ? Number(form.userId) : undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      setMessage('Distributor created');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEdit = (d) => {
    setEditingId(d.id);
    setEditForm({
      name: d.name || '',
      contactPhone: d.contactPhone || '',
      contactEmail: d.contactEmail || '',
    });
    setError('');
    setMessage('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    setSavingEdit(true);
    setError('');
    try {
      await api.put(`/distributors/${editingId}`, {
        name: editForm.name.trim(),
        contactPhone: editForm.contactPhone.trim() || undefined,
        contactEmail: editForm.contactEmail.trim() || '',
      });
      setMessage('Distributor updated');
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        badge="Team"
        title="Distributors"
        subtitle="Manage field distributors, link supervisor accounts, and track worker payments."
        action={
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            <Icon name="briefcase" className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Add Distributor'}
          </button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="font-semibold text-ink-900">New Distributor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
            <div>
              <label className="label">Opening Balance (₹)</label>
              <input type="number" className="input" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Link login user (optional)</label>
              <select className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                <option value="">— None —</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email}) — Supervisor
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-500 mt-1">A supervisor can also act as this distributor after linking.</p>
            </div>
          </div>
          <button type="submit" className="btn-primary">Create Distributor</button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {distributors.map((d) => (
          <div key={d.id} className="card-elevated">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-lg text-ink-900">{d.name}</h3>
                {d.contactPhone && <p className="text-sm text-ink-500 mt-0.5">{d.contactPhone}</p>}
              </div>
              <Badge tone="brand">{d.workerCount} workers</Badge>
            </div>

            {d.linkedUser ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={d.linkedUser.isSupervisorDistributor ? 'warning' : 'brand'}>
                  {d.linkedUser.isSupervisorDistributor ? 'Supervisor + Distributor' : d.linkedUser.role}
                </Badge>
                <span className="text-xs text-ink-500">{d.linkedUser.name}</span>
              </div>
            ) : (
              <p className="text-xs text-amber-600 mt-3">No login linked</p>
            )}

            <div className="mt-4 pt-4 border-t border-ink-100 grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wide">Paid</p>
                <p className="font-bold text-emerald-700 tabular-nums">₹{d.totalPaid?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wide">Pending</p>
                <p className="font-bold text-amber-700 tabular-nums">₹{d.totalPending?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wide">Opening</p>
                <p className="font-semibold tabular-nums">₹{d.openingBalance?.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button type="button" className="btn-secondary flex-1 text-sm" onClick={() => openEdit(d)}>
                Edit Name
              </button>
              <button
                type="button"
                className="btn-primary flex-1 text-sm"
                onClick={() => navigate(`/distributors/${d.id}`)}
              >
                Manage
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingId && (
        <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
          <form onSubmit={saveEdit} className="card w-full max-w-md space-y-4 animate-fade-in">
            <h3 className="font-bold text-lg text-ink-900">Edit Distributor</h3>
            <div>
              <label className="label">Distributor Name</label>
              <input
                className="input"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={editForm.contactPhone}
                onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={editForm.contactEmail}
                onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setEditingId(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
