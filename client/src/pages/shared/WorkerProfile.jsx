import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Alert,
  Avatar,
  Badge,
  Icon,
  LoadingState,
  PageHeader,
  StatCard,
} from '../../components/ui';

const STATUS_COLORS = {
  PRESENT: 'bg-emerald-500',
  HALF_DAY: 'bg-amber-400',
  ABSENT: 'bg-rose-400',
};

const STATUS_LABELS = {
  PRESENT: 'P',
  HALF_DAY: '½',
  ABSENT: 'A',
};

const METHOD_LABELS = {
  CASH: 'Cash',
  UPI: 'UPI / Online',
  BANK: 'Bank Transfer',
  OTHER: 'Other',
};

function monthBounds(year, month) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function formatMoney(value) {
  return `₹${(Number(value) || 0).toLocaleString()}`;
}

function AttendanceBarChart({ calendar }) {
  if (!calendar?.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-[2px] h-36 px-1">
        {calendar.map((day) => {
          const height =
            day.status === 'PRESENT' ? 100 : day.status === 'HALF_DAY' ? 55 : day.status === 'ABSENT' ? 30 : 6;
          const color = day.status ? STATUS_COLORS[day.status] : 'bg-ink-100';
          const paid = day.accrualStatus === 'PAID' || day.paymentStatus === 'PAID';

          return (
            <div
              key={day.date}
              className="flex-1 min-w-[4px] flex flex-col justify-end group relative"
              title={
                day.status
                  ? `${day.date}: ${day.status}${day.accrualAmount != null ? ` · ${formatMoney(day.accrualAmount)}` : ''}`
                  : day.date
              }
            >
              <div
                className={`w-full rounded-t transition-all ${color} ${paid ? 'ring-1 ring-primary-400' : ''} group-hover:opacity-80`}
                style={{ height: `${height}%`, minHeight: day.status ? 8 : 4 }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-ink-400 px-1">
        <span>1</span>
        <span>{Math.ceil(calendar.length / 2)}</span>
        <span>{calendar.length}</span>
      </div>
    </div>
  );
}

export default function WorkerProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = new Date();
  const year = Number(searchParams.get('y') || today.getFullYear());
  const month = Number(searchParams.get('m') ?? today.getMonth());

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { from, to } = useMemo(() => monthBounds(year, month), [year, month]);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/workers/${id}/profile?from=${from}&to=${to}`)
      .then((res) => setProfile(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, from, to]);

  const changeMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    setSearchParams({ y: String(d.getFullYear()), m: String(d.getMonth()) });
  };

  const calendarMap = useMemo(() => {
    const map = {};
    profile?.calendar?.forEach((day) => {
      map[day.date] = day;
    });
    return map;
  }, [profile]);

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const cells = [];

    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let day = 1; day <= last.getDate(); day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ day, dateStr, data: calendarMap[dateStr] });
    }
    return cells;
  }, [year, month, calendarMap]);

  const monthLabel = new Date(year, month, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  if (loading) return <LoadingState label="Loading worker profile..." />;
  if (error) return <div className="page-shell"><Alert type="error">{error}</Alert></div>;
  if (!profile) return null;

  const { worker, transactions, summary } = profile;
  const att = summary?.attendance || { present: 0, halfDay: 0, absent: 0, unmarked: 0 };

  return (
    <div className="page-shell space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate(user?.role === 'ADMIN' ? '/workers' : -1)}
          className="text-sm text-primary-600 font-semibold hover:underline"
        >
          ← Back to workers
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar name={worker.name} size="lg" />
        <div className="flex-1">
          <PageHeader
            title={worker.name}
            subtitle={`${formatMoney(worker.dailyRate)}/day · ${worker.distributor?.name || '—'} · Pay every ${worker.payoutIntervalDays} days`}
            badge={worker.status === 'ACTIVE' ? 'Active' : 'Inactive'}
          />
          {worker.phone && <p className="text-sm text-ink-500 -mt-2">{worker.phone}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Paid"
          value={formatMoney(worker.totalPaid)}
          sub="Lifetime salary paid"
          variant="success"
          icon={<Icon name="check" className="w-5 h-5" />}
        />
        <StatCard
          label="Unpaid Balance"
          value={formatMoney(worker.unpaidBalance)}
          sub="Accrued, awaiting payment"
          variant="warning"
          icon={<Icon name="banknote" className="w-5 h-5" />}
        />
        <StatCard
          label={`Earned (${monthLabel.split(' ')[0]})`}
          value={formatMoney(summary?.monthEarned)}
          sub="From attendance this month"
          variant="brand"
          icon={<Icon name="calendar" className="w-5 h-5" />}
        />
        <StatCard
          label={`Paid (${monthLabel.split(' ')[0]})`}
          value={formatMoney(summary?.monthPaid)}
          sub={`Remaining ${formatMoney(summary?.monthRemaining)}`}
          variant="default"
          icon={<Icon name="wallet" className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-ink-900">Attendance Chart</h3>
              <p className="text-sm text-ink-500">Daily presence for {monthLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => changeMonth(-1)}>
                ‹
              </button>
              <span className="text-sm font-semibold min-w-[120px] text-center">{monthLabel}</span>
              <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => changeMonth(1)}>
                ›
              </button>
            </div>
          </div>

          <AttendanceBarChart calendar={profile.calendar} />

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-lg font-bold text-emerald-700">{att.present}</p>
              <p className="text-[10px] text-emerald-600 font-semibold uppercase">Present</p>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-lg font-bold text-amber-700">{att.halfDay}</p>
              <p className="text-[10px] text-amber-600 font-semibold uppercase">Half</p>
            </div>
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
              <p className="text-lg font-bold text-rose-700">{att.absent}</p>
              <p className="text-[10px] text-rose-600 font-semibold uppercase">Absent</p>
            </div>
            <div className="p-2 rounded-xl bg-ink-50 border border-ink-100">
              <p className="text-lg font-bold text-ink-600">{att.unmarked}</p>
              <p className="text-[10px] text-ink-500 font-semibold uppercase">Open</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-ink-600 pt-2 border-t border-ink-100">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Present</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" /> Half day</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-400" /> Absent</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-2 ring-primary-400" /> Paid day</span>
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="font-semibold text-ink-900">Attendance Calendar</h3>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1 font-semibold">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell, idx) => {
              if (!cell) return <div key={`pad-${idx}`} className="aspect-square" />;

              const { data, day, dateStr } = cell;
              const status = data?.status;
              const paid = data?.accrualStatus === 'PAID' || data?.paymentStatus === 'PAID';
              const locked = !data?.isEditable && status;

              return (
                <div
                  key={dateStr}
                  title={
                    status
                      ? `${dateStr}: ${status}${data?.accrualAmount != null ? ` · ${formatMoney(data.accrualAmount)}` : ''}`
                      : dateStr
                  }
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs border transition ${
                    status
                      ? `${STATUS_COLORS[status]} text-white border-transparent shadow-sm`
                      : 'bg-ink-50 text-ink-400 border-ink-100'
                  } ${locked || paid ? 'ring-2 ring-primary-400 ring-offset-1' : ''}`}
                >
                  <span className="font-bold">{day}</span>
                  {status && <span className="text-[10px] mt-0.5 opacity-90">{STATUS_LABELS[status]}</span>}
                  {data?.accrualAmount != null && status && (
                    <span className="text-[8px] opacity-90 mt-0.5">₹{Math.round(data.accrualAmount)}</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-ink-500">
            Current pay period: {worker.currentPeriod?.start} → {worker.currentPeriod?.end}
          </p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-semibold text-ink-900">Payment History</h3>
            <p className="text-sm text-ink-500">
              {transactions.length} payments · {formatMoney(worker.totalDisbursed)} total disbursed
            </p>
          </div>
          {user?.role === 'ADMIN' && (
            <Link to="/pay-salary" className="text-sm text-primary-600 font-semibold hover:underline">
              Record payment →
            </Link>
          )}
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-ink-500 text-center py-12">No payments recorded for this worker yet</p>
        ) : (
          <div className="divide-y divide-ink-50">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-ink-50/50 transition">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="danger">Paid</Badge>
                    <span className="font-bold text-rose-700 tabular-nums">−{formatMoney(t.amount)}</span>
                  </div>
                  <p className="text-sm text-ink-600 mt-1">
                    {METHOD_LABELS[t.paymentMethod] || t.paymentMethod || 'Payment'}
                    {t.createdBy ? ` · by ${t.createdBy.name}` : ''}
                    {t.distributor ? ` · ${t.distributor.name}` : ''}
                  </p>
                  {t.notes && <p className="text-xs text-ink-400 mt-1 line-clamp-2">{t.notes}</p>}
                  <p className="text-[11px] text-ink-400 mt-1">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
