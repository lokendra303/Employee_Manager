import { useEffect, useState } from 'react';
import api from '../../api/client';

const STATUS_STYLES = {
  CORRECT: 'bg-green-100 text-green-800 border-green-200',
  PAYMENT_CHANGED: 'bg-orange-100 text-orange-800 border-orange-200',
  OVER_REQUESTED: 'bg-red-100 text-red-800 border-red-200',
  EXCEEDS_FUND_NEEDED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

function VerificationPanel({ verification, onApprove, onReject }) {
  if (!verification) return null;

  const { isCorrect, verificationStatus, message, atRequest, current, comparison, workerComparison } =
    verification;

  return (
    <div className="border-t pt-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold">Cross Verification (live data)</h4>
          <p className="text-sm text-gray-500 mt-1">Compared against current attendance & accrual records</p>
        </div>
        <span
          className={`text-sm font-medium px-3 py-1 rounded-full border ${
            STATUS_STYLES[verificationStatus] || 'bg-gray-100'
          }`}
        >
          {isCorrect ? 'Verified Correct' : verificationStatus.replace(/_/g, ' ')}
        </span>
      </div>

      <p className={`text-sm ${isCorrect ? 'text-green-700' : 'text-orange-700'}`}>{message}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">At request time</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Payment due</span>
              <span className="font-medium">₹{atRequest.totalPaymentDue?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Requested</span>
              <span className="font-medium">₹{atRequest.requestedAmount?.toLocaleString()}</span>
            </div>
            {atRequest.fundNeeded != null && (
              <div className="flex justify-between">
                <span>Fund needed</span>
                <span>₹{atRequest.fundNeeded?.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 bg-primary-50 rounded-lg border border-primary-100">
          <p className="text-xs font-medium text-primary-600 uppercase mb-2">Current (now)</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Payment due</span>
              <span className="font-bold">₹{current.totalPaymentDue?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Available balance</span>
              <span>₹{current.availableBalance?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Fund needed</span>
              <span className="font-bold text-primary-700">₹{current.fundNeeded?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {!isCorrect && (
        <div className="text-sm bg-orange-50 border border-orange-100 rounded-lg p-3 space-y-1">
          <p>
            Payment due change:{' '}
            <span className="font-medium">
              {comparison.paymentDueDelta >= 0 ? '+' : ''}₹{comparison.paymentDueDelta?.toLocaleString()}
            </span>
          </p>
          <p>
            Requested vs current due:{' '}
            <span className="font-medium">₹{comparison.requestedVsCurrentDue?.toLocaleString()}</span>
          </p>
        </div>
      )}

      <div>
        <p className="text-sm font-medium mb-2">Worker-by-worker verification</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 pr-3">Worker</th>
                <th className="pb-2 pr-3">At request</th>
                <th className="pb-2 pr-3">Now</th>
                <th className="pb-2 pr-3">Days</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {workerComparison.map((w) => (
                <tr key={w.workerId} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{w.workerName}</td>
                  <td className="py-2 pr-3">₹{w.submittedAmount?.toLocaleString()}</td>
                  <td className="py-2 pr-3">₹{w.currentAmount?.toLocaleString()}</td>
                  <td className="py-2 pr-3 text-gray-500">
                    {w.submittedDays} → {w.currentDays}
                  </td>
                  <td className="py-2">
                    {w.match ? (
                      <span className="text-green-600 text-xs font-medium">Match</span>
                    ) : (
                      <span className="text-orange-600 text-xs font-medium">
                        Δ ₹{w.delta?.toLocaleString()}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {workerComparison.some((w) => w.currentAccruals?.length > 0) && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-primary-600">View current accrual dates</summary>
          <div className="mt-3 space-y-3">
            {workerComparison
              .filter((w) => w.currentAccruals?.length > 0)
              .map((w) => (
                <div key={w.workerId} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium mb-1">{w.workerName}</p>
                  {w.currentAccruals.map((a) => (
                    <div key={a.workDate} className="flex justify-between text-gray-600">
                      <span>{a.workDate}</span>
                      <span>₹{a.amount}</span>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </details>
      )}

      {onApprove && onReject && (
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => onApprove(verification)}
          >
            {isCorrect
              ? 'Approve Request'
              : `Approve ₹${current.fundNeeded?.toLocaleString()} (verified amount)`}
          </button>
          {!isCorrect && (
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => onApprove(verification, true)}
            >
              Approve requested ₹{atRequest.requestedAmount?.toLocaleString()} anyway
            </button>
          )}
          <button type="button" className="btn-danger sm:w-32" onClick={onReject}>
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminFundRequests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [verifications, setVerifications] = useState({});
  const [verifyingId, setVerifyingId] = useState(null);
  const [markSentId, setMarkSentId] = useState(null);
  const [sentForm, setSentForm] = useState({
    paymentMethod: 'CASH',
    reference: '',
    notes: '',
  });
  const [sending, setSending] = useState(false);

  const FILTERS = ['PENDING', 'APPROVED', 'FUND_SENT', 'RECEIVED', 'DISPUTED', 'REJECTED'];

  const load = () => {
    api.get(`/fund-requests?status=${filter}`).then((res) => setRequests(res.data));
  };

  useEffect(() => {
    load();
    setExpandedId(null);
    setVerifications({});
  }, [filter]);

  const runVerification = async (id) => {
    setVerifyingId(id);
    setError('');
    try {
      const res = await api.get(`/fund-requests/${id}/verify`);
      setVerifications((prev) => ({ ...prev, [id]: res.data }));
      setExpandedId(id);
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  const approve = async (verification, useRequestedAmount = false) => {
    const id = verification.fundRequestId;
    const amount = useRequestedAmount
      ? verification.atRequest.requestedAmount
      : verification.isCorrect
        ? verification.atRequest.requestedAmount
        : verification.current.fundNeeded;

    try {
      await api.post(`/fund-requests/${id}/approve`, {
        approvedAmount: amount,
        acknowledgeMismatch: !verification.isCorrect || useRequestedAmount,
      });
      setMessage(`Fund request approved — ₹${amount?.toLocaleString()}. Mark funds as sent when transferred.`);
      setExpandedId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const reject = async (e) => {
    e.preventDefault();
    await api.post(`/fund-requests/${rejectId}/reject`, { reason: rejectReason });
    setRejectId(null);
    setRejectReason('');
    setMessage('Fund request rejected');
    load();
  };

  const markSent = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.post(`/fund-requests/${markSentId}/mark-sent`, sentForm);
      setMessage('Funds marked as sent — waiting for requester to accept');
      setMarkSentId(null);
      setSentForm({ paymentMethod: 'CASH', reference: '', notes: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const requesterLabel = (r) => {
    if (r.requesterType === 'SUPERVISOR') return `Supervisor: ${r.requestedBy?.name}`;
    return r.distributor?.name || `Distributor: ${r.requestedBy?.name}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Fund Requests</h2>
        <p className="text-sm text-gray-500 mt-1">
          Approve requests, mark funds sent, then requester accepts to credit their wallet
        </p>
      </div>

      {message && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium min-h-[44px] ${
              filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">No fund requests</div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="card space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-lg">{requesterLabel(r)}</p>
                  <p className="text-sm text-gray-500">
                    {r.requesterType} · Requested by {r.requestedBy?.name} ·{' '}
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">At request (payment due)</p>
                      <p className="font-bold">₹{r.calculatedAmount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Requested</p>
                      <p className="font-bold text-primary-700">₹{r.requestedAmount?.toLocaleString()}</p>
                    </div>
                    {r.approvedAmount && (
                      <div>
                        <p className="text-gray-500">Approved</p>
                        <p className="font-bold text-green-600">₹{r.approvedAmount?.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  {r.notes && <p className="text-sm text-gray-600 mt-2">Note: {r.notes}</p>}
                  {r.rejectReason && (
                    <p className="text-sm text-red-600 mt-2">Rejected: {r.rejectReason}</p>
                  )}
                  {r.disputeReason && (
                    <p className="text-sm text-yellow-700 mt-2">Disputed: {r.disputeReason}</p>
                  )}
                  {r.sentPaymentMethod && (
                    <p className="text-sm text-purple-700 mt-2">
                      Sent via {r.sentPaymentMethod}
                      {r.sentReference ? ` · Ref: ${r.sentReference}` : ''}
                    </p>
                  )}
                </div>
                {r.status === 'PENDING' && (
                  <div className="flex flex-col gap-2 sm:w-44">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => runVerification(r.id)}
                      disabled={verifyingId === r.id}
                    >
                      {verifyingId === r.id ? 'Verifying...' : 'Cross Verify'}
                    </button>
                    {expandedId !== r.id && (
                      <button type="button" className="btn-danger" onClick={() => setRejectId(r.id)}>
                        Reject
                      </button>
                    )}
                  </div>
                )}
                {(r.status === 'APPROVED' || r.status === 'DISPUTED') && (
                  <div className="flex flex-col gap-2 sm:w-48">
                    <button type="button" className="btn-primary" onClick={() => setMarkSentId(r.id)}>
                      Mark Fund Sent
                    </button>
                  </div>
                )}
              </div>

              {expandedId === r.id && verifications[r.id] && (
                <VerificationPanel
                  verification={verifications[r.id]}
                  onApprove={r.status === 'PENDING' ? approve : null}
                  onReject={r.status === 'PENDING' ? () => setRejectId(r.id) : null}
                />
              )}

              {r.status !== 'PENDING' && r.breakdown?.workers?.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Submitted worker breakdown</p>
                  <div className="space-y-1">
                    {r.breakdown.workers.map((w) => (
                      <div key={w.workerId} className="flex justify-between text-sm text-gray-600">
                        <span>
                          {w.workerName} ({w.daysCount} days)
                        </span>
                        <span>₹{w.amount?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {markSentId && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50">
          <form onSubmit={markSent} className="card w-full max-w-md space-y-4">
            <h3 className="font-semibold">Mark Fund as Sent</h3>
            <p className="text-sm text-gray-500">
              Record how you transferred the approved amount to the requester
            </p>
            <div>
              <label className="label">Payment Method</label>
              <select
                className="input"
                value={sentForm.paymentMethod}
                onChange={(e) => setSentForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / Online</option>
                <option value="BANK">Bank Transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Reference (UPI txn ID, cheque no., etc.)</label>
              <input
                className="input"
                value={sentForm.reference}
                onChange={(e) => setSentForm((f) => ({ ...f, reference: e.target.value }))}
                placeholder="Required for online/bank"
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="input min-h-[80px]"
                value={sentForm.notes}
                onChange={(e) => setSentForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setMarkSentId(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={sending}>
                {sending ? 'Saving...' : 'Confirm Sent'}
              </button>
            </div>
          </form>
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50">
          <form onSubmit={reject} className="card w-full max-w-md space-y-4">
            <h3 className="font-semibold">Reject Fund Request</h3>
            <textarea
              className="input min-h-[100px]"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection"
              required
              minLength={3}
            />
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setRejectId(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-danger flex-1">
                Reject
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
