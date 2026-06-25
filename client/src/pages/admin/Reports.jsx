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

function ledgerCategoryLabel(category) {
  const map = {
    FUND_RECEIVED: 'Fund received',
    FUND_SENT: 'Fund sent',
    FUND_APPROVED: 'Fund approved',
    WORKER_PAYMENT: 'Worker payment',
    WALLET_CREDIT: 'Wallet credit',
  };
  return map[category] || category;
}

function ledgerCategoryTone(category) {
  if (category === 'FUND_RECEIVED' || category === 'WALLET_CREDIT') return 'success';
  if (category === 'WORKER_PAYMENT') return 'warning';
  if (category === 'FUND_SENT') return 'brand';
  return 'neutral';
}

function sourceLabel(source) {
  const map = {
    ADMIN_DIRECT: 'Admin direct',
    ORG_WALLET: 'Org wallet',
    PERSONAL_ADVANCE: 'Personal advance',
  };
  return map[source] || source;
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
  const [financial, setFinancial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('money');
  const [range, setRange] = useState(() => monthRange(0));
  const [customFrom, setCustomFrom] = useState(range.from);
  const [customTo, setCustomTo] = useState(range.to);

  const load = async (from, to) => {
    setLoading(true);
    setError('');
    try {
      const [daysRes, reconRes, financeRes] = await Promise.all([
        api.get(`/reports/days-worked?from=${from}&to=${to}`),
        api.get('/reports/distributor-reconciliation').catch(() => ({ data: [] })),
        api.get(`/reports/financial-overview?from=${from}&to=${to}`).catch(() => ({ data: null })),
      ]);
      setDaysReport(daysRes.data);
      setReconciliation(reconRes.data);
      setFinancial(financeRes.data);
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
        subtitle="Track funds sent to field staff, salary paid to workers, and attendance accruals."
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

      <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-ink-100/80 w-fit">
        {[
          { id: 'money', label: 'Money flow' },
          { id: 'workers', label: 'Workers' },
          { id: 'projects', label: 'Projects' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === t.id ? 'bg-white text-primary-700 shadow-sm' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'money' && financial && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Funds to field staff"
              value={formatMoney(financial.summary.fundsReleasedToStaff)}
              sub="Received into supervisor/distributor wallets"
              variant="brand"
              icon={<Icon name="banknote" className="w-5 h-5" />}
            />
            <StatCard
              label="Paid to workers"
              value={formatMoney(financial.summary.workerPayments.total)}
              sub={`${financial.summary.workerPayments.count} payments in period`}
              variant="success"
              icon={<Icon name="check" className="w-5 h-5" />}
            />
            <StatCard
              label="Accruals marked paid"
              value={formatMoney(financial.summary.salaryAccrualsMarkedPaid)}
              sub="Salary liability cleared (not cash movement)"
              icon={<Icon name="chart" className="w-5 h-5" />}
            />
            <StatCard
              label="Salary still pending"
              value={formatMoney(financial.summary.salaryStillPending)}
              sub="Unpaid accruals (all time)"
              variant="warning"
              icon={<Icon name="alert" className="w-5 h-5" />}
            />
          </div>

          <div className="card space-y-4">
            <div>
              <h3 className="font-semibold text-ink-900">Payment breakdown</h3>
              <p className="text-sm text-ink-500">How worker salaries were funded in this period</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="rounded-xl border border-ink-100 p-4 bg-ink-50/50">
                <p className="text-ink-500">From org wallet</p>
                <p className="text-xl font-bold text-ink-900 mt-1">
                  {formatMoney(financial.summary.workerPayments.fromOrgWallet)}
                </p>
                <p className="text-xs text-ink-400 mt-1">Supervisor/distributor used released funds</p>
              </div>
              <div className="rounded-xl border border-ink-100 p-4 bg-amber-50/50">
                <p className="text-amber-700">Personal advance</p>
                <p className="text-xl font-bold text-amber-900 mt-1">
                  {formatMoney(financial.summary.workerPayments.personalAdvance)}
                </p>
                <p className="text-xs text-amber-600/80 mt-1">Paid from personal funds, pending reimbursement</p>
              </div>
              <div className="rounded-xl border border-ink-100 p-4 bg-primary-50/50">
                <p className="text-primary-700">Admin direct</p>
                <p className="text-xl font-bold text-primary-900 mt-1">
                  {formatMoney(financial.summary.workerPayments.adminDirect)}
                </p>
                <p className="text-xs text-primary-600/80 mt-1">Admin paid worker without wallet debit</p>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <div>
              <h3 className="font-semibold text-ink-900">Fund requests</h3>
              <p className="text-sm text-ink-500">Org cash sent to supervisors and distributors</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border border-ink-100 p-3">
                <p className="text-ink-500 text-xs font-semibold uppercase">Approved</p>
                <p className="font-bold text-lg">{formatMoney(financial.summary.fundRequests.approvedAmount)}</p>
                <p className="text-ink-400 text-xs">{financial.summary.fundRequests.approvedCount} requests</p>
              </div>
              <div className="rounded-lg border border-ink-100 p-3">
                <p className="text-ink-500 text-xs font-semibold uppercase">Sent</p>
                <p className="font-bold text-lg">{formatMoney(financial.summary.fundRequests.sentAmount)}</p>
                <p className="text-ink-400 text-xs">{financial.summary.fundRequests.sentCount} in period</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                <p className="text-emerald-600 text-xs font-semibold uppercase">Received</p>
                <p className="font-bold text-lg text-emerald-800">
                  {formatMoney(financial.summary.fundRequests.receivedAmount)}
                </p>
                <p className="text-emerald-600/70 text-xs">{financial.summary.fundRequests.receivedCount} credited</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                <p className="text-amber-700 text-xs font-semibold uppercase">In pipeline</p>
                <p className="font-bold text-lg text-amber-900">
                  {formatMoney(
                    financial.summary.fundsApprovedNotSent + financial.summary.fundsSentNotYetReceived
                  )}
                </p>
                <p className="text-amber-600/70 text-xs">{financial.summary.fundRequests.pendingCount} open</p>
              </div>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-ink-100 bg-gradient-to-r from-ink-50 to-white">
              <h3 className="font-semibold text-ink-900">Activity ledger</h3>
              <p className="text-sm text-ink-500 mt-0.5">Every fund release and worker payment in this period</p>
            </div>
            {!financial.ledger?.length ? (
              <EmptyState title="No financial activity" description="No fund releases or worker payments in this period." />
            ) : (
              <div className="divide-y divide-ink-100 max-h-[480px] overflow-y-auto">
                {financial.ledger.map((item) => (
                  <div key={item.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-ink-50/40">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={ledgerCategoryTone(item.category)}>{ledgerCategoryLabel(item.category)}</Badge>
                        {item.source && (
                          <span className="text-xs text-ink-500">{sourceLabel(item.source)}</span>
                        )}
                      </div>
                      <p className="font-semibold text-ink-900 mt-1">{item.label}</p>
                      <p className="text-sm text-ink-500 truncate">
                        {[item.party, item.project, item.paidBy ? `by ${item.paidBy}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {item.detail && <p className="text-xs text-ink-400 mt-0.5 truncate">{item.detail}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-bold text-lg ${
                          item.category === 'WORKER_PAYMENT' ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {item.category === 'WORKER_PAYMENT' ? '−' : '+'}
                        {formatMoney(item.amount)}
                      </p>
                      <p className="text-xs text-ink-400">
                        {new Date(item.date).toLocaleDateString()} {item.method || ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'workers' && (
        <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Workers" value={totals.workers} variant="brand" icon={<Icon name="workers" className="w-5 h-5" />} />
        <StatCard label="Present Days" value={totals.present} variant="success" icon={<Icon name="calendar" className="w-5 h-5" />} />
        <StatCard label="Effective Days" value={totals.effective.toFixed(1)} sub="Present + ½ half days" icon={<Icon name="chart" className="w-5 h-5" />} />
        <StatCard label="Accruals paid" value={formatMoney(totals.paid)} variant="success" icon={<Icon name="check" className="w-5 h-5" />} />
        <StatCard label="Accruals pending" value={formatMoney(totals.pending)} variant="warning" icon={<Icon name="banknote" className="w-5 h-5" />} />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 bg-gradient-to-r from-ink-50 to-white">
          <h3 className="font-semibold text-ink-900 flex items-center gap-2">
            <Icon name="workers" className="w-5 h-5 text-primary-600" />
            Days Worked & Salary
          </h3>
          <p className="text-sm text-ink-500 mt-0.5">Per worker — accruals marked paid vs still owed (not cash payments)</p>
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
                    <th className="py-3 px-4 font-semibold">Accrual paid</th>
                    <th className="py-3 px-5 font-semibold">Accrual pending</th>
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
        </>
      )}

      {tab === 'projects' && reconciliation.length > 0 && (
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

      {tab === 'projects' && reconciliation.length === 0 && (
        <EmptyState title="No projects" description="Add a project/site to see balances here." />
      )}
    </div>
  );
}
