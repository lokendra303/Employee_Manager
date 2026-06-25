import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import {
  Alert,
  Badge,
  EmptyState,
  Icon,
  LoadingState,
  PageHeader,
  StatCard,
} from '../../components/ui';

function formatMoney(value) {
  return `₹${(Number(value) || 0).toLocaleString()}`;
}

function monthRange(offset = 0) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const from = d.toISOString().slice(0, 10);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export default function Reports() {
  const [daysReport, setDaysReport] = useState(null);
  const [reconciliation, setReconciliation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState(() => monthRange(0));
  const [customFrom, setCustomFrom] = useState(range.from);
  const [customTo, setCustomTo] = useState(range.to);

  const load = async (from, to) => {
    setLoading(true);
    setError('');
    try {
      const [daysRes, reconRes] = await Promise.all([
        api.get(`/reports/days-worked?from=${from}&to=${to}`),
        api.get('/reports/distributor-reconciliation').catch(() => ({ data: [] })),
      ]);
      setDaysReport(daysRes.data);
      setReconciliation(reconRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(range.from, range.to);
  }, [range.from, range.to]);

  const totals = useMemo(() => {
    const rows = daysReport?.report || [];
    return rows.reduce(
      (acc, r) => ({
        workers: acc.workers + 1,
        present: acc.present + (r.presentDays || 0),
        effective: acc.effective + (r.effectiveDays || 0),
        paid: acc.paid + (r.totalPaid || 0),
        pending: acc.pending + (r.totalPending || 0),
      }),
      { workers: 0, present: 0, effective: 0, paid: 0, pending: 0 }
    );
  }, [daysReport]);

  const applyCustomRange = (e) => {
    e.preventDefault();
    if (customFrom && customTo) setRange({ from: customFrom, to: customTo });
  };

  if (loading && !daysReport) return <LoadingState label="Loading reports..." />;

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        badge="Analytics"
        title="Reports"
        subtitle="Attendance days worked, salary paid vs pending, and project/site balances."
      />

      {error && <Alert type="error">{error}</Alert>}

      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink-900">Date range</h3>
            <p className="text-sm text-ink-500">
              {daysReport?.from} → {daysReport?.to}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-sm" onClick={() => setRange(monthRange(0))}>
              This month
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => setRange(monthRange(-1))}>
              Last month
            </button>
          </div>
        </div>
        <form onSubmit={applyCustomRange} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="label">From</label>
            <input type="date" className="input" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          </div>
          <div className="flex-1 w-full">
            <label className="label">To</label>
            <input type="date" className="input" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full sm:w-auto">
            Apply
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Workers" value={totals.workers} variant="brand" icon={<Icon name="workers" className="w-5 h-5" />} />
        <StatCard label="Present Days" value={totals.present} variant="success" icon={<Icon name="calendar" className="w-5 h-5" />} />
        <StatCard label="Effective Days" value={totals.effective.toFixed(1)} sub="Present + ½ half days" icon={<Icon name="chart" className="w-5 h-5" />} />
        <StatCard label="Paid" value={formatMoney(totals.paid)} variant="success" icon={<Icon name="check" className="w-5 h-5" />} />
        <StatCard label="Pending" value={formatMoney(totals.pending)} variant="warning" icon={<Icon name="banknote" className="w-5 h-5" />} />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 bg-gradient-to-r from-ink-50 to-white">
          <h3 className="font-semibold text-ink-900 flex items-center gap-2">
            <Icon name="workers" className="w-5 h-5 text-primary-600" />
            Days Worked & Salary
          </h3>
          <p className="text-sm text-ink-500 mt-0.5">Per worker for selected period</p>
        </div>

        {!daysReport?.report?.length ? (
          <EmptyState title="No report data" description="Mark attendance or add workers for this period." />
        ) : (
          <>
            <div className="md:hidden divide-y divide-ink-100">
              {daysReport.report.map((r) => (
                <div key={r.workerId} className="p-4 space-y-3 hover:bg-ink-50/50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-ink-900">{r.workerName}</p>
                    <Badge tone="brand">{r.effectiveDays} eff. days</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2.5">
                      <p className="text-[10px] font-bold uppercase text-emerald-600">Present</p>
                      <p className="font-bold text-emerald-800">{r.presentDays}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-2.5">
                      <p className="text-[10px] font-bold uppercase text-amber-600">Half days</p>
                      <p className="font-bold text-amber-800">{r.halfDays}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50/80 border border-emerald-100 p-2.5">
                      <p className="text-[10px] font-bold uppercase text-emerald-600">Paid</p>
                      <p className="font-bold text-emerald-800">{formatMoney(r.totalPaid)}</p>
                    </div>
                    <div className="rounded-lg bg-orange-50 border border-orange-100 p-2.5">
                      <p className="text-[10px] font-bold uppercase text-orange-600">Pending</p>
                      <p className="font-bold text-orange-800">{formatMoney(r.totalPending)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b bg-ink-50/80">
                    <th className="py-3 px-5 font-semibold">Worker</th>
                    <th className="py-3 px-4 font-semibold">Present</th>
                    <th className="py-3 px-4 font-semibold">Half</th>
                    <th className="py-3 px-4 font-semibold">Effective</th>
                    <th className="py-3 px-4 font-semibold">Paid</th>
                    <th className="py-3 px-5 font-semibold">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {daysReport.report.map((r) => (
                    <tr key={r.workerId} className="border-b border-ink-50 hover:bg-ink-50/40">
                      <td className="py-3 px-5 font-semibold text-ink-900">{r.workerName}</td>
                      <td className="py-3 px-4">{r.presentDays}</td>
                      <td className="py-3 px-4">{r.halfDays}</td>
                      <td className="py-3 px-4 font-medium">{r.effectiveDays}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-700">{formatMoney(r.totalPaid)}</td>
                      <td className="py-3 px-5 font-semibold text-amber-700">{formatMoney(r.totalPending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {reconciliation.length > 0 && (
        <div className="card space-y-4">
          <div>
            <h3 className="font-semibold text-ink-900 flex items-center gap-2">
              <Icon name="briefcase" className="w-5 h-5 text-primary-600" />
              Project / Site Balances
            </h3>
            <p className="text-sm text-ink-500 mt-0.5">Credits, payouts, and remaining balance per project</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reconciliation.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border border-ink-100 bg-gradient-to-br from-white to-ink-50 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-ink-900">{d.name}</p>
                  <Badge tone="neutral">{d.workerCount} workers</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Accrual credits</span>
                    <span className="font-medium">{formatMoney(d.totalCredits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Paid out</span>
                    <span className="font-medium text-rose-600">−{formatMoney(d.totalDisbursements)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-ink-100">
                    <span className="font-semibold text-ink-700">Balance</span>
                    <span className="font-bold text-primary-700">{formatMoney(d.balance)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
