import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present', active: 'bg-green-500 text-white', idle: 'bg-gray-100 text-gray-600' },
  { value: 'HALF_DAY', label: 'Half Day', active: 'bg-yellow-500 text-white', idle: 'bg-gray-100 text-gray-600' },
  { value: 'ABSENT', label: 'Absent', active: 'bg-red-500 text-white', idle: 'bg-gray-100 text-gray-600' },
];

const LOCK_LABELS = {
  PAID: 'Paid — locked',
  PARTIAL: 'Partially paid — locked',
  PERIOD_LOCKED: 'Period closed — locked',
};

export default function Attendance() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [grid, setGrid] = useState([]);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/attendance?date=${date}`);
      setGrid(res.data.grid);
      const initial = {};
      res.data.grid.forEach((row) => {
        if (row.attendance) {
          initial[row.worker.id] = row.attendance.status;
        }
      });
      setMarks(initial);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [date]);

  const setStatus = (workerId, status, editable) => {
    if (!editable) return;
    setMarks((prev) => ({ ...prev, [workerId]: status }));
  };

  const editableRows = grid.filter((row) => row.isEditable !== false);
  const hasEditableMarks = editableRows.some((row) => marks[row.worker.id]);

  const handleSave = async () => {
    const payload = editableRows
      .filter((row) => marks[row.worker.id])
      .map((row) => ({
        workerId: row.worker.id,
        status: marks[row.worker.id],
      }));

    if (payload.length === 0) {
      setError('Mark at least one editable worker');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.post('/attendance/bulk', { date, records: payload });
      setMessage('Attendance saved successfully');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Mark Attendance</h2>
          <p className="text-sm text-gray-500 mt-1">
            Saved attendance with payment cannot be changed
          </p>
        </div>
        <input
          type="date"
          className="input sm:w-auto"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {message && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : grid.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">No workers assigned</div>
      ) : (
        <>
          <div className="space-y-3">
            {grid.map((row) => {
              const editable = row.isEditable !== false;
              const current = marks[row.worker.id] || row.attendance?.status;
              const lockLabel = LOCK_LABELS[row.lockReason];

              return (
                <div
                  key={row.worker.id}
                  className={`card ${!editable ? 'bg-gray-50 border-gray-200' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div>
                      <Link
                        to={`/workers/${row.worker.id}`}
                        className="font-semibold text-primary-700 hover:underline"
                      >
                        {row.worker.name}
                      </Link>
                      <p className="text-sm text-gray-500">
                        ₹{row.worker.dailyRate}/day · {row.worker.distributor}
                      </p>
                      {row.accrual?.amount != null && (
                        <p className="text-xs text-gray-400 mt-1">
                          Accrued: ₹{row.accrual.amount}
                          {row.paymentStatus === 'PAID' && ' · Paid'}
                          {row.paymentStatus === 'PARTIAL' && ' · Partially paid'}
                        </p>
                      )}
                    </div>
                    {!editable && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full whitespace-nowrap">
                        {lockLabel || 'Locked'}
                      </span>
                    )}
                    {editable && row.attendance && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Saved
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {STATUS_OPTIONS.map((opt) => {
                      const selected = current === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={!editable}
                          onClick={() => setStatus(row.worker.id, opt.value, editable)}
                          className={`rounded-lg py-3 text-sm font-medium transition min-h-[44px] ${
                            selected ? opt.active : opt.idle
                          } ${!editable ? 'opacity-80 cursor-not-allowed' : 'hover:opacity-90'}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {hasEditableMarks && (
            <div className="sticky bottom-20 md:bottom-4 md:static">
              <button
                className="btn-primary w-full"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
