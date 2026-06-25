import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Alert, Avatar, EmptyState, Icon, PageHeader, StatCard } from '../../components/ui';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: 'cash' },
  { value: 'UPI', label: 'UPI / Online', icon: 'phone' },
  { value: 'BANK', label: 'Bank Transfer', icon: 'bank' },
  { value: 'OTHER', label: 'Other', icon: 'list' },
];

const emptyForm = {
  amount: '',
  paymentMethod: 'CASH',
  paymentReference: '',
  notes: '',
  paidFromPersonal: false,
};

export default function PaySalary({ title = 'Pay Salary' }) {
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedDistributorId, setSelectedDistributorId] = useState(null);
  const [accruals, setAccruals] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [personalAdvanceDue, setPersonalAdvanceDue] = useState(0);

  const isOnline = form.paymentMethod === 'UPI' || form.paymentMethod === 'BANK';
  const canPayFromPersonal = user?.role === 'SUPERVISOR' || user?.role === 'DISTRIBUTOR';

  useEffect(() => {
    const load = async () => {
      const workersUrl =
        user?.role === 'SUPERVISOR' && user?.linkedDistributorId
          ? '/workers?scope=distributor'
          : '/workers';
      const wRes = await api.get(workersUrl);
      setWorkers(wRes.data);

      if (user?.role === 'DISTRIBUTOR') {
        const dRes = await api.get('/distributors');
        if (dRes.data[0]) setSelectedDistributorId(dRes.data[0].id);
      } else if (user?.linkedDistributorId) {
        setSelectedDistributorId(user.linkedDistributorId);
      }

      if (user?.role === 'DISTRIBUTOR' || user?.role === 'SUPERVISOR') {
        const walletRes = await api.get('/wallet').catch(() => ({ data: { balance: 0, personalAdvanceDue: 0 } }));
        setWalletBalance(walletRes.data.balance ?? 0);
        setPersonalAdvanceDue(walletRes.data.personalAdvanceDue ?? 0);
      }
    };
    load();
  }, [user?.role]);

  const loadAccruals = async (worker) => {
    setSelectedWorker(worker.id);
    setSelectedDistributorId(worker.distributorId);
    setForm(emptyForm);
    setMessage('');
    setError('');
    const res = await api.get(`/pay/accruals/${worker.id}`);
    setAccruals(res.data);
  };

  const setQuickAmount = (value) => {
    setForm((f) => ({ ...f, amount: String(value) }));
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    const distributorId = selectedDistributorId;
    if (!distributorId || !selectedWorker) return;

    const amount = Number(form.amount);
    if (amount <= 0) {
      setError('Enter a valid payment amount');
      return;
    }
    if (amount > accruals.balance) {
      setError(`Amount cannot exceed unpaid balance of ₹${accruals.balance}`);
      return;
    }
    if (isOnline && !form.paymentReference.trim() && !form.notes.trim()) {
      setError('Online/bank payment requires a transaction reference or note');
      return;
    }

    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const res = await api.post(`/distributors/${distributorId}/transactions`, {
        workerId: selectedWorker,
        amount,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference.trim() || undefined,
        notes: form.notes.trim() || undefined,
        paidFromPersonal: form.paidFromPersonal || undefined,
      });

      const partial = res.data.isPartial;
      const remaining = res.data.remainingBalance;
      const personal = res.data.paidFromPersonal;
      const advanceAmount = res.data.personalAdvanceAmount ?? 0;
      setMessage(
        personal
          ? partial
            ? advanceAmount > 0 && res.data.walletAmountUsed > 0
              ? `₹${res.data.walletAmountUsed.toLocaleString()} from wallet, ₹${advanceAmount.toLocaleString()} personal advance recorded. Remaining unpaid: ₹${remaining?.toLocaleString()}.`
              : `Personal advance of ₹${(advanceAmount || amount).toLocaleString()} recorded. Remaining unpaid: ₹${remaining?.toLocaleString()}. Request reimbursement via Fund Request.`
            : advanceAmount > 0 && res.data.walletAmountUsed > 0
              ? `₹${res.data.walletAmountUsed.toLocaleString()} from wallet, ₹${advanceAmount.toLocaleString()} personal advance recorded.`
              : `Personal advance of ₹${(advanceAmount || amount).toLocaleString()} recorded. Request reimbursement via Fund Request.`
          : partial
            ? `Partial payment of ₹${amount.toLocaleString()} recorded. Remaining unpaid: ₹${remaining?.toLocaleString()}`
            : `Full payment of ₹${amount.toLocaleString()} recorded successfully`
      );
      if (walletBalance != null) {
        const walletRes = await api.get('/wallet').catch(() => null);
        if (walletRes?.data) {
          setWalletBalance(walletRes.data.balance ?? 0);
          setPersonalAdvanceDue(walletRes.data.personalAdvanceDue ?? 0);
        }
      }
      const worker = workers.find((w) => w.id === selectedWorker);
      if (worker) loadAccruals(worker);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const payAmount = Number(form.amount) || 0;
  const remainingAfter = Math.max(0, (accruals?.balance || 0) - payAmount);
  const selectedWorkerData = workers.find((w) => w.id === selectedWorker);

  return (
    <div className="page-shell">
      <PageHeader
        badge="Salary"
        title={title}
        subtitle="Record full or partial payments. Supports wallet disbursement and personal advance tracking."
        action={
          canPayFromPersonal && (
            <Link to="/fund-requests" className="btn-secondary text-sm">
              <Icon name="spark" className="w-4 h-4" />
              Fund Request
            </Link>
          )
        }
      />

      {message && <Alert type="success">{message}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {walletBalance != null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label="Wallet Balance"
            value={`₹${walletBalance.toLocaleString()}`}
            sub="Available to pay workers"
            variant={walletBalance < 0 ? 'danger' : 'brand'}
            icon={<Icon name="wallet" className="w-5 h-5" />}
          />
          {personalAdvanceDue > 0 ? (
            <StatCard
              label="Personal Advance Due"
              value={`₹${personalAdvanceDue.toLocaleString()}`}
              sub="Reimbursed first when admin releases funds"
              variant="warning"
              icon={<Icon name="alert" className="w-5 h-5" />}
            />
          ) : walletBalance < 0 ? (
            <StatCard
              label="Personal Advance Due"
              value={`₹${Math.abs(walletBalance).toLocaleString()}`}
              sub="Wallet is negative — request fund reimbursement"
              variant="warning"
              icon={<Icon name="alert" className="w-5 h-5" />}
            />
          ) : null}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-ink-500 uppercase tracking-wider mb-3">Select Worker</h3>
        <div className="space-y-2">
          {workers.length === 0 ? (
            <EmptyState title="No workers available" description="Workers assigned to you will appear here." />
          ) : (
            workers.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => loadAccruals(w)}
                className={`card-elevated w-full text-left p-4 transition-all duration-200 ${
                  selectedWorker === w.id
                    ? 'ring-2 ring-primary-500 border-primary-200 bg-primary-50/30'
                    : 'hover:border-primary-200/60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <Avatar name={w.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink-900">{w.name}</p>
                    <p className="text-sm text-ink-500 mt-0.5">
                      ₹{w.dailyRate}/day · Every {w.payoutIntervalDays} days
                      {w.distributor?.name && (
                        <span className="text-ink-400"> · {w.distributor.name}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-primary-600 text-sm font-semibold shrink-0">
                    Pay
                    <Icon name="arrow" className="w-4 h-4" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {accruals && selectedWorkerData && (
        <div className="card overflow-hidden p-0">
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-5 py-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm font-medium">Unpaid balance for {selectedWorkerData.name}</p>
                <p className="text-4xl font-bold mt-1 tabular-nums">₹{accruals.balance?.toLocaleString()}</p>
              </div>
              <div className="text-right text-sm text-primary-100">
                <p>Pay period</p>
                <p className="font-semibold text-white mt-0.5">
                  {accruals.currentPeriod?.start} → {accruals.currentPeriod?.end}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {accruals.accruals?.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">Unpaid days</p>
                <div className="rounded-xl border border-ink-100 divide-y divide-ink-100 overflow-hidden">
                  {accruals.accruals.map((a) => (
                    <div key={a.id} className="flex justify-between items-center px-4 py-3 text-sm bg-white hover:bg-ink-50/50">
                      <span className="text-ink-600 font-medium">{a.workDate}</span>
                      <span className="font-semibold text-ink-900 tabular-nums">₹{a.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-500 text-center py-4">No unpaid salary for this worker.</p>
            )}

            {accruals.balance > 0 && (
              <form onSubmit={recordPayment} className="space-y-5 pt-2">
                <div>
                  <label className="label">Payment amount (₹)</label>
                  <input
                    type="number"
                    className="input text-lg font-semibold"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder={`Max ₹${accruals.balance}`}
                    required
                    min="1"
                    max={accruals.balance}
                    step="1"
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[
                      { label: `Full ₹${accruals.balance}`, value: accruals.balance },
                      { label: `Half ₹${Math.floor(accruals.balance / 2)}`, value: Math.floor(accruals.balance / 2) },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-ink-100 text-ink-700 hover:bg-primary-100 hover:text-primary-800 transition"
                        onClick={() => setQuickAmount(chip.value)}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                  {payAmount > 0 && payAmount < accruals.balance && (
                    <p className="text-sm text-amber-700 mt-2 flex items-center gap-1.5">
                      <Icon name="alert" className="w-4 h-4" />
                      ₹{remainingAfter.toLocaleString()} will remain unpaid
                    </p>
                  )}
                </div>

                {canPayFromPersonal && (
                  <label
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                      form.paidFromPersonal
                        ? 'border-amber-400 bg-amber-50/80'
                        : 'border-ink-200 bg-ink-50/50 hover:border-amber-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 rounded accent-amber-600"
                      checked={form.paidFromPersonal}
                      onChange={(e) => setForm({ ...form, paidFromPersonal: e.target.checked })}
                    />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Paid from my personal money</p>
                      <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                        Already paid the worker from your pocket? Record it here. If wallet balance is
                        insufficient, the shortfall is tracked as personal advance (wallet goes negative)
                        until admin releases funds.
                      </p>
                    </div>
                  </label>
                )}

                <div>
                  <label className="label">Payment method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setForm({ ...form, paymentMethod: m.value })}
                        className={`flex items-center gap-2.5 p-3.5 rounded-xl border-2 text-sm font-semibold transition ${
                          form.paymentMethod === m.value
                            ? 'border-primary-500 bg-primary-50 text-primary-800 shadow-sm'
                            : 'border-ink-100 bg-white text-ink-600 hover:border-ink-200'
                        }`}
                      >
                        <Icon name={m.icon} className="w-5 h-5 shrink-0" />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isOnline && (
                  <div>
                    <label className="label">Transaction reference</label>
                    <input
                      className="input"
                      value={form.paymentReference}
                      onChange={(e) => setForm({ ...form, paymentReference: e.target.value })}
                      placeholder="UPI txn ID, bank ref no."
                    />
                  </div>
                )}

                <div>
                  <label className="label">
                    Note {form.paymentMethod === 'CASH' ? '(optional)' : '(recommended)'}
                  </label>
                  <textarea
                    className="input min-h-[88px] resize-none"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder={
                      form.paymentMethod === 'CASH'
                        ? 'e.g. Paid in cash on site'
                        : 'e.g. Paid via PhonePe to worker'
                    }
                  />
                </div>

                {payAmount > 0 && (
                  <div className="rounded-xl bg-ink-50 border border-ink-100 p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-500">Paying now</span>
                      <span className="font-bold text-ink-900 tabular-nums">₹{payAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-ink-500">
                      <span>Method</span>
                      <span className="font-medium text-ink-700">
                        {PAYMENT_METHODS.find((m) => m.value === form.paymentMethod)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between text-ink-500">
                      <span>Remaining after</span>
                      <span className="font-medium tabular-nums">₹{remainingAfter.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting
                    ? 'Recording...'
                    : form.paidFromPersonal
                      ? payAmount > 0
                        ? `Record Personal Advance · ₹${payAmount.toLocaleString()}`
                        : 'Record Personal Advance'
                      : payAmount > 0 && payAmount < accruals.balance
                        ? `Record Partial · ₹${payAmount.toLocaleString()}`
                        : payAmount > 0
                          ? `Record Full Payment · ₹${payAmount.toLocaleString()}`
                          : 'Record Payment'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
