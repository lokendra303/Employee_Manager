import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
  PRESENT: 'bg-green-500 text-white',
  HALF_DAY: 'bg-yellow-400 text-yellow-900',
  ABSENT: 'bg-red-400 text-white',
};

const STATUS_LABELS = {
  PRESENT: 'P',
  HALF_DAY: '½',
  ABSENT: 'A',
};

const METHOD_LABELS = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK: 'Bank',
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

  if (loading) return <div className="text-center py-12 text-gray-500">Loading profile...</div>;
  if (error) return <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>;
  if (!profile) return null;

  const { worker, transactions } = profile;

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate(user?.role === 'ADMIN' ? '/workers' : -1)}
          className="text-sm text-primary-600 hover:underline"
        >
          ← Back
        </button>
        <h2 className="text-xl font-bold mt-2">{worker.name}</h2>
        <p className="text-sm text-gray-500 mt-1">
          ₹{worker.dailyRate}/day · {worker.distributor?.name} · Pay every {worker.payoutIntervalDays} days
        </p>
        <div className="flex flex-wrap gap-3 mt-3 text-sm">
          <span className="card py-2 px-3">
            Unpaid balance: <strong className="text-primary-700">₹{worker.unpaidBalance?.toLocaleString()}</strong>
          </span>
          <span className="card py-2 px-3 text-gray-600">
            Period: {worker.currentPeriod?.start} → {worker.currentPeriod?.end}
          </span>
          <span
            className={`text-xs px-2 py-1 rounded-full self-center ${
              worker.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {worker.status}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Attendance Calendar</h3>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary px-3 py-1 text-sm" onClick={() => changeMonth(-1)}>
              ‹
            </button>
            <span className="text-sm font-medium min-w-[140px] text-center">{monthLabel}</span>
            <button type="button" className="btn-secondary px-3 py-1 text-sm" onClick={() => changeMonth(1)}>
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1 font-medium">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell, idx) => {
            if (!cell) return <div key={`pad-${idx}`} className="aspect-square" />;

            const { data, day, dateStr } = cell;
            const status = data?.status;
            const paid = data?.paymentStatus === 'PAID' || data?.paymentStatus === 'PARTIAL';
            const locked = !data?.isEditable && status;

            return (
              <div
                key={dateStr}
                title={
                  status
                    ? `${dateStr}: ${status}${paid ? ' (paid)' : ''}${data?.accrualAmount != null ? ` · ₹${data.accrualAmount}` : ''}`
                    : dateStr
                }
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs border ${
                  status ? STATUS_COLORS[status] : 'bg-gray-50 text-gray-400 border-gray-100'
                } ${locked ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
              >
                <span className="font-semibold">{day}</span>
                {status && <span className="text-[10px] mt-0.5">{STATUS_LABELS[status]}</span>}
                {paid && <span className="text-[9px] opacity-90">₹</span>}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500" /> Present
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-400" /> Half day
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-400" /> Absent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-blue-400" /> Paid / locked
          </span>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">Payment History</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No payments recorded for this worker</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => (
              <div key={t.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-red-700">-₹{t.amount?.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">
                    {METHOD_LABELS[t.paymentMethod] || t.paymentMethod || 'Payment'}
                    {t.createdBy ? ` · by ${t.createdBy.name}` : ''}
                  </p>
                  {t.notes && <p className="text-xs text-gray-500 mt-1 truncate">{t.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
