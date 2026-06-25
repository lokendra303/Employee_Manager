import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Alert, Badge, Icon, LoadingState, PageHeader, StatCard } from '../../components/ui';

const STATUS_TONES = {
  PENDING: 'warning',
  APPROVED: 'brand',
  FUND_SENT: 'purple',
  RECEIVED: 'success',
  REJECTED: 'danger',
  DISPUTED: 'warning',
};

export default function RequesterFundRequests() {
  const [calculation, setCalculation] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [personalAdvanceDue, setPersonalAdvanceDue] = useState(0);
  const [requests, setRequests] = useState([]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [disputeId, setDisputeId] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [actionId, setActionId] = useState(null);

  const load = async () => {
    try {
      const [calcRes, reqRes, walletRes] = await Promise.all([
        api.get('/fund-requests/calculate'),
        api.get('/fund-requests'),
        api.get('/wallet').catch(() => ({ data: { balance: 0 } })),
      ]);
      setCalculation(calcRes.data);
      setRequests(reqRes.data);
      setWalletBalance(walletRes.data.balance ?? 0);
      setPersonalAdvanceDue(walletRes.data.personalAdvanceDue ?? 0);
      setAmount(String(calcRes.data.fundNeeded || ''));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const hasActive = requests.some((r) =>
    ['PENDING', 'APPROVED', 'FUND_SENT', 'DISPUTED'].includes(r.status)
  );

  const submitRequest = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      await api.post('/fund-requests', { requestedAmount: Number(amount), notes });
      setMessage('Fund request submitted to organization admin');
      setNotes('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const acceptReceipt = async (id) => {
    setActionId(id);
    setError('');
    try {
      await api.post(`/fund-requests/${id}/accept`);
      setMessage('Funds accepted and credited to your wallet');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const submitDispute = async (e) => {
    e.preventDefault();
    setActionId(disputeId);
    try {
      await api.post(`/fund-requests/${disputeId}/dispute`, { reason: disputeReason });
      setMessage('Dispute submitted — admin will review');
      setDisputeId(null);
      setDisputeReason('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <LoadingState label="Loading fund requests..." />;

  return (
    <div className="page-shell">
      <PageHeader
        badge="Finance"
        title="Fund Request"
        subtitle="Request organization funds. Payment breakdown is for reference — admin decides the approved amount."
        action={
          <Link to="/wallet" className="btn-secondary text-sm">
            <Icon name="wallet" className="w-4 h-4" />
            Wallet · ₹{walletBalance.toLocaleString()}
          </Link>
        }
      />

      {message && <Alert type="success">{message}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {calculation && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Worker Payments Due"
              value={`₹${calculation.totalPaymentDue?.toLocaleString()}`}
              sub={`${calculation.workerCount} workers`}
              variant="brand"
              icon={<Icon name="workers" className="w-5 h-5" />}
            />
            <StatCard
              label="Wallet Balance"
              value={`₹${walletBalance.toLocaleString()}`}
              sub="Available to pay"
              variant={walletBalance < 0 ? 'danger' : 'success'}
              icon={<Icon name="wallet" className="w-5 h-5" />}
            />
            <StatCard
              label="Personal Advance"
              value={`₹${(calculation.personalAdvanceDue ?? personalAdvanceDue)?.toLocaleString()}`}
              sub="Pending reimbursement"
              variant="warning"
              icon={<Icon name="alert" className="w-5 h-5" />}
            />
          {calculation.fundNeeded > 0 && (
            <StatCard
              label="Fund Needed"
              value={`₹${calculation.fundNeeded?.toLocaleString()}`}
              sub="Suggested request amount"
              variant="default"
              icon={<Icon name="spark" className="w-5 h-5" />}
            />
          )}
          </div>

          {calculation.workers?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-ink-900 mb-4">Payment Breakdown</h3>
              <div className="rounded-xl border border-ink-100 divide-y divide-ink-100 overflow-hidden">
                {calculation.workers.map((w) => (
                  <div key={w.workerId} className="flex justify-between items-center px-4 py-3.5 text-sm hover:bg-ink-50/50">
                    <div>
                      <span className="font-semibold text-ink-800">{w.workerName}</span>
                      <span className="text-ink-400 ml-2">{w.daysCount} days</span>
                    </div>
                    <span className="font-bold text-ink-900 tabular-nums">₹{w.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasActive && (
            <form onSubmit={submitRequest} className="card space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Icon name="banknote" className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink-900">Raise Fund Request</h3>
                  <p className="text-xs text-ink-500">Admin will review and send funds</p>
                </div>
              </div>
              <div>
                <label className="label">Amount to request (₹)</label>
                <input
                  type="number"
                  className="input text-lg font-semibold"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="label">Notes for admin</label>
                <textarea
                  className="input min-h-[88px] resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Weekly payout + personal advance reimbursement"
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Fund Request'}
              </button>
            </form>
          )}

          {hasActive && (
            <Alert type="warning">
              You have an active fund request in progress. Complete accept or dispute before submitting another.
            </Alert>
          )}
        </>
      )}

      {requests.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-ink-900 mb-4">Request History</h3>
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-ink-100 p-4 space-y-3 hover:border-ink-200 transition">
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-2">
                    <Badge tone={STATUS_TONES[r.status] || 'neutral'}>
                      {r.status.replace(/_/g, ' ')}
                    </Badge>
                    <p className="text-sm text-ink-600">
                      Requested <span className="font-semibold text-ink-900">₹{r.requestedAmount?.toLocaleString()}</span>
                      {' · '}
                      Due <span className="font-semibold">₹{r.calculatedAmount?.toLocaleString()}</span>
                    </p>
                    {r.approvedAmount != null && (
                      <p className="text-sm text-primary-700 font-medium">
                        Approved: ₹{r.approvedAmount?.toLocaleString()}
                        {r.approvedAmount !== r.requestedAmount && (
                          <span className="text-ink-500 font-normal">
                            {' '}
                            (you requested ₹{r.requestedAmount?.toLocaleString()})
                          </span>
                        )}
                      </p>
                    )}
                    {r.sentPaymentMethod && r.status !== 'PENDING' && r.status !== 'APPROVED' && (
                      <p className="text-xs text-ink-500">
                        Sent via {r.sentPaymentMethod}
                        {r.sentReference ? ` · Ref: ${r.sentReference}` : ''}
                      </p>
                    )}
                    {r.rejectReason && <p className="text-sm text-rose-600">Rejected: {r.rejectReason}</p>}
                    {r.disputeReason && <p className="text-sm text-amber-700">Disputed: {r.disputeReason}</p>}
                  </div>
                  <p className="text-xs text-ink-400 shrink-0">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>

                {r.status === 'FUND_SENT' && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-ink-100">
                    <button
                      type="button"
                      className="btn-primary flex-1"
                      onClick={() => acceptReceipt(r.id)}
                      disabled={actionId === r.id}
                    >
                      {actionId === r.id ? 'Processing...' : `Accept ₹${r.approvedAmount?.toLocaleString()}`}
                    </button>
                    <button type="button" className="btn-danger flex-1" onClick={() => setDisputeId(r.id)}>
                      Dispute
                    </button>
                  </div>
                )}

                {r.status === 'APPROVED' && r.approvedAmount != null && (
                  <p className="text-sm text-primary-600 pt-3 border-t border-ink-100 flex items-center gap-1.5">
                    <Icon name="spark" className="w-4 h-4" />
                    Approved for ₹{r.approvedAmount?.toLocaleString()} — waiting for admin to mark funds as sent
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {disputeId && (
        <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
          <form onSubmit={submitDispute} className="card w-full max-w-md space-y-4 animate-fade-in">
            <h3 className="font-bold text-lg text-ink-900">Dispute Fund Receipt</h3>
            <p className="text-sm text-ink-500">Explain why you did not receive the funds</p>
            <textarea
              className="input min-h-[100px] resize-none"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="e.g. Amount not received in bank account"
              required
              minLength={3}
            />
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setDisputeId(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-danger flex-1">
                Submit Dispute
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
