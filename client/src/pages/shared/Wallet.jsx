import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Alert, Badge, Icon, LoadingState, PageHeader, StatCard } from '../../components/ui';

const TYPE_LABELS = {
  CREDIT: 'Fund received',
  DEBIT: 'Worker payment',
  ADJUSTMENT: 'Adjustment',
};

function getTransactionLabel(transaction) {
  if (transaction.type === 'DEBIT' && transaction.notes?.startsWith('[Personal advance]')) {
    return 'Personal advance';
  }
  return TYPE_LABELS[transaction.type] || transaction.type;
}

function getTransactionTone(transaction) {
  if (transaction.type === 'CREDIT') return 'success';
  if (transaction.notes?.startsWith('[Personal advance]')) return 'warning';
  if (transaction.type === 'DEBIT') return 'danger';
  return 'neutral';
}

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/wallet')
      .then((res) => setWallet(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading wallet..." />;
  if (error) return <Alert type="error">{error}</Alert>;

  const balance = wallet?.balance ?? 0;
  const advanceDue = wallet?.personalAdvanceDue ?? 0;

  return (
    <div className="page-shell">
      <PageHeader
        badge="Finance"
        title="My Wallet"
        subtitle="Track organization funds received and salary disbursements from your balance."
        action={
          <Link to="/fund-requests" className="btn-primary text-sm">
            <Icon name="spark" className="w-4 h-4" />
            Request Funds
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Available Balance"
          value={`₹${balance.toLocaleString()}`}
          sub={balance < 0 ? 'Overdrawn — reimbursement due' : 'Ready to pay workers'}
          variant={balance < 0 ? 'danger' : 'brand'}
          icon={<Icon name="wallet" className="w-5 h-5" />}
        />
        <StatCard
          label="Personal Advance Due"
          value={`₹${advanceDue.toLocaleString()}`}
          sub="Claim via Fund Request"
          variant={advanceDue > 0 ? 'warning' : 'default'}
          icon={<Icon name="banknote" className="w-5 h-5" />}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
          <h3 className="font-semibold text-ink-900">Transaction History</h3>
          <span className="text-xs text-ink-400 font-medium uppercase tracking-wider">Recent 50</span>
        </div>

        {!wallet?.transactions?.length ? (
          <div className="text-center py-14 px-6">
            <div className="w-12 h-12 rounded-2xl bg-ink-100 flex items-center justify-center mx-auto mb-3">
              <Icon name="list" className="w-6 h-6 text-ink-400" />
            </div>
            <p className="font-medium text-ink-600">No transactions yet</p>
            <p className="text-sm text-ink-400 mt-1">Payments and fund credits will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-50">
            {wallet.transactions.map((t) => {
              const isCredit = t.type !== 'DEBIT';
              const tone = getTransactionTone(t);
              return (
                <div key={t.id} className="flex items-start gap-4 px-5 py-4 hover:bg-ink-50/60 transition">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    <Icon name={isCredit ? 'spark' : 'banknote'} className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-ink-900">{getTransactionLabel(t)}</p>
                      <Badge tone={tone}>{t.type}</Badge>
                    </div>
                    {t.worker && (
                      <p className="text-xs text-ink-500 mt-0.5">Worker: {t.worker.name}</p>
                    )}
                    {t.reference && <p className="text-xs text-ink-400 mt-0.5">Ref: {t.reference}</p>}
                    {t.notes && (
                      <p className="text-xs text-ink-400 mt-1 line-clamp-2">{t.notes}</p>
                    )}
                    <p className="text-[11px] text-ink-400 mt-1.5">
                      {new Date(t.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`font-bold text-base tabular-nums shrink-0 ${
                      isCredit ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isCredit ? '+' : '−'}₹{t.amount?.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
