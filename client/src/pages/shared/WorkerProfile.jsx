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

const METHOD_ICONS = {
  CASH: 'cash',
  UPI: 'phone',
  BANK: 'bank',
  OTHER: 'list',
};

function PaymentTimeline({ transactions }) {
  if (!transactions?.length) {
    return (
      <div className="text-center py-14 px-6">
        <div className="w-14 h-14 rounded-2xl bg-ink-100 flex items-center justify-center mx-auto mb-3">
          <Icon name="banknote" className="w-7 h-7 text-ink-400" />
        </div>
        <p className="font-semibold text-ink-600">No payments yet</p>
        <p className="text-sm text-ink-400 mt-1">Salary disbursements will appear here</p>
      </div>
    );
  }

  return (
    <div className="relative px-2">
      <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-rose-200 via-primary-200 to-emerald-200 rounded-full" />
      <div className="space-y-0">
        {transactions.map((t, idx) => (
          <div
            key={t.id}
            className="relative flex gap-4 py-4 pl-10 hover:bg-ink-50/60 rounded-xl transition-colors -ml-2 pr-2"
          >
            <div className="absolute left-2.5 top-5 w-4 h-4 rounded-full bg-white border-[3px] border-rose-400 shadow-sm z-10" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl font-bold text-rose-600 tabular-nums">−{formatMoney(t.amount)}</span>
                <Badge tone="brand">{METHOD_LABELS[t.paymentMethod] || t.paymentMethod}</Badge>
              </div>
              <p className="text-sm text-ink-600 mt-1">
                {t.createdBy?.name ? `Paid by ${t.createdBy.name}` : 'Payment recorded'}
                {t.distributor?.name ? ` · ${t.distributor.name}` : ''}
              </p>
              {t.notes && <p className="text-xs text-ink-500 mt-1.5 bg-ink-50 rounded-lg px-3 py-2 border border-ink-100">{t.notes}</p>}
              <p className="text-[11px] text-ink-400 mt-2 flex items-center gap-1.5">
                <Icon name={METHOD_ICONS[t.paymentMethod] || 'card'} className="w-3.5 h-3.5" />
                {new Date(t.createdAt).toLocaleString()}
              </p>
            </div>
            {idx === 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-1 rounded-lg h-fit">
                Latest
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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
      <button
        type="button"
        onClick={() => navigate(user?.role === 'ADMIN' ? '/workers' : -1)}
        className="inline-flex items-center gap-1.5 text-sm text-primary-600 font-semibold hover:underline"
      >
        <span>←</span> Back to workers
      </button>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-teal-800 text-white p-6 sm:p-8 shadow-card">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-4 bottom-0 w-32 h-32 rounded-full bg-teal-400/20 blur-xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="ring-4 ring-white/20 rounded-2xl">
            <Avatar name={worker.name} size="lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{worker.name}</h1>
              <Badge tone={worker.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {worker.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-primary-100 mt-1.5 text-sm sm:text-base">
              {formatMoney(worker.dailyRate)}/day · {worker.distributor?.name || '—'} · Pay every {worker.payoutIntervalDays} days
            </p>
            {worker.phone && <p className="text-primary-200/90 text-sm mt-1">{worker.phone}</p>}
            <p className="text-xs text-primary-200/70 mt-2">
              Pay period {worker.currentPeriod?.start} → {worker.currentPeriod?.end}
            </p>
          </div>
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
        <div className="px-5 py-4 border-b border-ink-100 bg-gradient-to-r from-ink-50 to-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-semibold text-ink-900 flex items-center gap-2">
              <Icon name="banknote" className="w-5 h-5 text-primary-600" />
              Payment History
            </h3>
            <p className="text-sm text-ink-500">
              {transactions.length} payments · {formatMoney(worker.totalDisbursed)} total disbursed
            </p>
          </div>
          {user?.role === 'ADMIN' && (
            <Link to="/pay" className="text-sm text-primary-600 font-semibold hover:underline">
              Record payment →
            </Link>
          )}
        </div>

        <PaymentTimeline transactions={transactions} />
      </div>
    </div>
  );
}
