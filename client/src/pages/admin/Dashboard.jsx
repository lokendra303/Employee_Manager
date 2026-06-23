import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

function StatCard({ label, value, sub, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[color]?.split(' ')[1] || 'text-gray-900'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/reports/summary')
      .then((res) => setSummary(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Dashboard</h2>
          {summary?.organizationName && (
            <p className="text-sm text-gray-500">{summary.organizationName}</p>
          )}
        </div>
        <Link to="/attendance" className="btn-primary text-sm">
          Mark Attendance
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Workers" value={summary?.workerCount ?? 0} color="primary" />
        <StatCard label="Distributors" value={summary?.distributorCount ?? 0} color="green" />
        <StatCard
          label="Marked Today"
          value={summary?.todayAttendance ?? 0}
          sub={`${summary?.unmarkedToday ?? 0} unmarked`}
          color="orange"
        />
        <StatCard
          label="Pending Pay"
          value={`₹${(summary?.pendingAccrualTotal ?? 0).toLocaleString()}`}
          sub={`${summary?.pendingAccrualCount ?? 0} accruals`}
          color="red"
        />
      </div>

      {summary?.recentEdits?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3">Recent Attendance Edits</h3>
          <div className="space-y-2">
            {summary.recentEdits.map((edit) => (
              <div key={edit.id} className="flex justify-between text-sm py-2 border-b last:border-0">
                <span className="text-gray-600">
                  {edit.user?.name} edited record #{edit.entityId}
                </span>
                <span className="text-gray-400 text-xs">
                  {new Date(edit.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
