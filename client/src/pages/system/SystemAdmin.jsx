import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function SystemAdmin() {
  const [stats, setStats] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const [statsRes, orgsRes] = await Promise.all([
      api.get('/system/stats'),
      api.get(`/system/organizations?status=${filter}`),
    ]);
    setStats(statsRes.data);
    setOrganizations(orgsRes.data);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const approve = async (id) => {
    await api.post(`/system/organizations/${id}/approve`);
    setMessage('Organization approved');
    load();
  };

  const reject = async (e) => {
    e.preventDefault();
    await api.post(`/system/organizations/${rejectId}/reject`, { reason: rejectReason });
    setRejectId(null);
    setRejectReason('');
    setMessage('Organization rejected');
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">System Administration</h2>
        <p className="text-sm text-gray-500 mt-1">Approve or reject organization registrations</p>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card"><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold text-orange-600">{stats.pending}</p></div>
          <div className="card"><p className="text-sm text-gray-500">Approved</p><p className="text-2xl font-bold text-green-600">{stats.approved}</p></div>
          <div className="card"><p className="text-sm text-gray-500">Rejected</p><p className="text-2xl font-bold text-red-600">{stats.rejected}</p></div>
          <div className="card"><p className="text-sm text-gray-500">Total Users</p><p className="text-2xl font-bold">{stats.totalUsers}</p></div>
        </div>
      )}

      <div className="flex gap-2">
        {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] ${
              filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {organizations.length === 0 ? (
          <div className="card text-center text-gray-500 py-8">No organizations in this list</div>
        ) : (
          organizations.map((org) => (
            <div key={org.id} className="card">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-lg">{org.name}</p>
                  <p className="text-sm text-gray-500">{org.contactEmail}</p>
                  {org.contactPhone && <p className="text-sm text-gray-500">{org.contactPhone}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    Registered {new Date(org.createdAt).toLocaleString()}
                  </p>
                  {org.users?.[0] && (
                    <p className="text-sm mt-2">
                      Admin: <span className="font-medium">{org.users[0].name}</span> ({org.users[0].email})
                    </p>
                  )}
                  {org.rejectedReason && (
                    <p className="text-sm text-red-600 mt-2">Reason: {org.rejectedReason}</p>
                  )}
                </div>
                {org.status === 'PENDING' && (
                  <div className="flex flex-col gap-2 sm:w-40">
                    <button type="button" className="btn-primary" onClick={() => approve(org.id)}>
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => setRejectId(org.id)}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {rejectId && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50">
          <form onSubmit={reject} className="card w-full max-w-md space-y-4">
            <h3 className="font-semibold">Reject Organization</h3>
            <div>
              <label className="label">Reason</label>
              <textarea
                className="input min-h-[100px]"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
                minLength={3}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setRejectId(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-danger flex-1">Reject</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
