import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Alert, Avatar, Badge, LoadingState, PageHeader } from '../../components/ui';

const emptySupervisor = { name: '', email: '', password: '' };

export default function Supervisors() {
  const [supervisors, setSupervisors] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', password: '', isActive: true });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptySupervisor);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const applySupervisor = (sup) => {
    if (!sup) return;
    setSelectedSupervisor(String(sup.id));
    setSelectedWorkers(sup.supervisorAssignments?.map((a) => a.workerId) || []);
    setProfileForm({
      name: sup.name || '',
      email: sup.email || '',
      password: '',
      isActive: sup.isActive ?? true,
    });
    setMessage('');
    setError('');
  };

  const load = async (keepSelection = true) => {
    try {
      const [sRes, wRes] = await Promise.all([
        api.get('/reports/supervisors'),
        api.get('/workers'),
      ]);
      const list = sRes.data;
      setSupervisors(list);
      setWorkers(wRes.data);

      if (keepSelection && selectedSupervisor) {
        const current = list.find((s) => s.id === Number(selectedSupervisor));
        if (current) applySupervisor(current);
      } else if (list.length > 0) {
        applySupervisor(list[0]);
      }

      return list;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(false);
  }, []);

  const selectSupervisor = (id) => {
    const sup = supervisors.find((s) => s.id === Number(id));
    applySupervisor(sup);
  };

  const toggleWorker = (workerId) => {
    setSelectedWorkers((prev) =>
      prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId]
    );
  };

  const addSupervisor = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await api.post('/reports/users', {
        ...form,
        role: 'SUPERVISOR',
      });
      setForm(emptySupervisor);
      setShowForm(false);
      setMessage(`Supervisor "${res.data.name}" added successfully`);
      await load();
      applySupervisor(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!selectedSupervisor) return;
    setSavingProfile(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        isActive: profileForm.isActive,
      };
      if (profileForm.password.trim()) {
        payload.password = profileForm.password;
      }
      await api.put(`/reports/supervisors/${selectedSupervisor}`, payload);
      setMessage('Supervisor profile updated');
      setProfileForm((f) => ({ ...f, password: '' }));
      await load(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const saveAssignments = async () => {
    setError('');
    setMessage('');
    try {
      await api.post('/reports/supervisors/assign', {
        supervisorId: Number(selectedSupervisor),
        workerIds: selectedWorkers,
      });
      setMessage('Worker assignments saved');
      await load();
      selectSupervisor(selectedSupervisor);
    } catch (err) {
      setError(err.message);
    }
  };

  const selectedData = supervisors.find((s) => s.id === Number(selectedSupervisor));

  if (loading) return <LoadingState label="Loading supervisors..." />;

  return (
    <div className="page-shell">
      <PageHeader
        badge="Team"
        title="Supervisors"
        subtitle="Create supervisors, edit their profile, and assign workers they can manage."
        action={
          <button
            className="btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              setError('');
            }}
          >
            {showForm ? 'Cancel' : 'Add Supervisor'}
          </button>
        }
      />

      {message && <Alert type="success">{message}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {showForm && (
        <form onSubmit={addSupervisor} className="card space-y-4">
          <h3 className="font-semibold text-ink-900">New Supervisor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rajesh Sharma"
                required
              />
            </div>
            <div>
              <label className="label">Email (login)</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="supervisor@company.com"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full sm:w-auto">
            Create Supervisor
          </button>
        </form>
      )}

      <div className="card">
        <h3 className="font-semibold text-ink-900 mb-1">All Supervisors ({supervisors.length})</h3>
        <p className="text-sm text-ink-500 mb-3">Select a supervisor below to edit their name, email, or password.</p>
        {supervisors.length === 0 ? (
          <p className="text-sm text-ink-500 py-4 text-center">No supervisors yet.</p>
        ) : (
          <div className="space-y-2">
            {supervisors.map((sup) => (
              <button
                key={sup.id}
                type="button"
                onClick={() => selectSupervisor(sup.id)}
                className={`w-full text-left p-4 rounded-xl border transition flex items-center gap-4 ${
                  Number(selectedSupervisor) === sup.id
                    ? 'border-primary-400 bg-primary-50/50 ring-1 ring-primary-200'
                    : 'border-ink-100 bg-white hover:border-ink-200'
                }`}
              >
                <Avatar name={sup.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900">{sup.name}</p>
                    {!sup.isActive && <Badge tone="danger">Inactive</Badge>}
                    {sup.distributorProfile && (
                      <Badge tone="warning">Also Distributor</Badge>
                    )}
                  </div>
                  <p className="text-sm text-ink-500 truncate">{sup.email}</p>
                </div>
                <span className="text-xs font-semibold bg-ink-100 text-ink-600 px-2.5 py-1 rounded-full shrink-0">
                  {sup.supervisorAssignments?.length || 0} workers
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {supervisors.length > 0 && !selectedSupervisor && (
        <Alert type="info">Select a supervisor from the list above to edit their profile.</Alert>
      )}

      {selectedSupervisor && selectedData && (
        <>
          <form onSubmit={saveProfile} className="card space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={selectedData.name} size="lg" />
              <div>
                <h3 className="font-semibold text-ink-900">Edit Profile</h3>
                <p className="text-sm text-ink-500">Update name, login email, or reset password</p>
              </div>
            </div>

            {selectedData.distributorProfile && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-900">
                Linked as distributor:{' '}
                <Link
                  to={`/distributors/${selectedData.distributorProfile.id}`}
                  className="font-semibold text-primary-700 hover:underline"
                >
                  {selectedData.distributorProfile.name}
                </Link>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Email (login)</label>
                <input
                  className="input"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">New Password (leave blank to keep current)</label>
                <input
                  className="input"
                  type="password"
                  value={profileForm.password}
                  onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                  placeholder="Min 6 characters if changing"
                  minLength={profileForm.password ? 6 : undefined}
                />
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-ink-200 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={profileForm.isActive}
                onChange={(e) => setProfileForm({ ...profileForm, isActive: e.target.checked })}
              />
              <div>
                <p className="text-sm font-semibold text-ink-900">Account active</p>
                <p className="text-xs text-ink-500">Inactive supervisors cannot sign in</p>
              </div>
            </label>

            <button type="submit" className="btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>

          <div className="card space-y-4">
            <h3 className="font-semibold text-ink-900">Assign Workers</h3>
            <p className="text-sm text-ink-500">
              {selectedData.name} can mark attendance and pay salary for checked workers only.
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {workers.map((w) => (
                <label
                  key={w.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-ink-100 bg-ink-50/50 cursor-pointer hover:bg-ink-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedWorkers.includes(w.id)}
                    onChange={() => toggleWorker(w.id)}
                    className="w-5 h-5 rounded accent-primary-600"
                  />
                  <div>
                    <span className="font-medium text-ink-900">{w.name}</span>
                    <span className="text-sm text-ink-500 ml-2">₹{w.dailyRate}/day</span>
                  </div>
                </label>
              ))}
            </div>

            <button type="button" className="btn-primary w-full" onClick={saveAssignments}>
              Save Worker Assignments
            </button>
          </div>
        </>
      )}
    </div>
  );
}
