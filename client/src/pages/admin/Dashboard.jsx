import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Icon, PageHeader, StatCard } from '../../components/ui';

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
    <div className="page-shell space-y-6">
      <PageHeader
        badge="Admin"
        title="Dashboard"
        subtitle={summary?.organizationName || 'Organization overview'}
        action={
          <Link to="/attendance" className="btn-primary text-sm">
            <Icon name="calendar" className="w-4 h-4" />
            Mark Attendance
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/distributors?add=1"
          className="card-elevated flex items-center gap-4 p-5 hover:border-emerald-200 transition group"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
            <Icon name="briefcase" className="w-7 h-7 text-emerald-700" />
          </div>
          <div>
            <p className="font-bold text-lg text-ink-900">Add Project / Site</p>
            <p className="text-sm text-ink-500 mt-0.5">Create a job site before adding workers</p>
          </div>
        </Link>
        <Link
          to="/workers?add=1"
          className="card-elevated flex items-center gap-4 p-5 hover:border-primary-200 transition group"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
            <Icon name="workers" className="w-7 h-7 text-primary-700" />
          </div>
          <div>
            <p className="font-bold text-lg text-ink-900">Add Worker</p>
            <p className="text-sm text-ink-500 mt-0.5">Register employee and assign to a project</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Workers"
          value={summary?.workerCount ?? 0}
          variant="brand"
          icon={<Icon name="workers" className="w-5 h-5" />}
        />
        <StatCard
          label="Projects / Sites"
          value={summary?.distributorCount ?? 0}
          variant="success"
          icon={<Icon name="briefcase" className="w-5 h-5" />}
        />
        <StatCard
          label="Marked Today"
          value={summary?.todayAttendance ?? 0}
          sub={`${summary?.unmarkedToday ?? 0} unmarked`}
          variant="warning"
          icon={<Icon name="calendar" className="w-5 h-5" />}
        />
        <StatCard
          label="Pending Pay"
          value={`₹${(summary?.pendingAccrualTotal ?? 0).toLocaleString()}`}
          sub={`${summary?.pendingAccrualCount ?? 0} accruals`}
          variant="danger"
          icon={<Icon name="banknote" className="w-5 h-5" />}
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
