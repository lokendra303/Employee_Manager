import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const METHOD_LABELS = {
  CASH: 'Cash',
  UPI: 'Online (UPI)',
  BANK: 'Bank Transfer',
  OTHER: 'Other',
};

export default function Transactions() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [filterDistributor, setFilterDistributor] = useState(searchParams.get('distributorId') || '');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = filterDistributor ? `?distributorId=${filterDistributor}` : '';
      const tRes = await api.get(`/reports/payment-transactions${params}`);
      setTransactions(tRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get('/distributors').then((res) => setDistributors(res.data));
    }
    load();
  }, [filterDistributor, user?.role]);

  const subtitle =
    user?.role === 'SUPERVISOR'
      ? 'Payments for your assigned workers and payments you recorded'
      : user?.role === 'ADMIN'
        ? 'All payment transactions in your organization'
        : 'Your distributor payment ledger';

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Payment Transactions</h2>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>

      {user?.role === 'ADMIN' && distributors.length > 0 && (
        <select
          className="input"
          value={filterDistributor}
          onChange={(e) => setFilterDistributor(e.target.value)}
        >
          <option value="">All distributors</option>
          {distributors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      )}

      {transactions.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">No transactions yet</div>
      ) : (
        <div className="space-y-3">
          {transactions.map((t) => (
            <div key={t.id} className="card">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      t.type === 'DISBURSEMENT'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {t.type.replace('_', ' ')}
                  </span>
                  <p className="font-medium mt-2">{t.worker?.name || '—'}</p>
                  {t.distributor && user?.role === 'ADMIN' && (
                    <p className="text-xs text-gray-500">Distributor: {t.distributor.name}</p>
                  )}
                  {t.createdBy && (
                    <p className="text-xs text-gray-500 mt-1">
                      By: {t.createdBy.name} ({t.createdBy.role})
                    </p>
                  )}
                  {t.paymentMethod && (
                    <p className="text-xs text-gray-500">
                      Method: {METHOD_LABELS[t.paymentMethod] || t.paymentMethod}
                    </p>
                  )}
                  {t.notes && <p className="text-sm text-gray-500 mt-1">{t.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-bold ${
                      t.type === 'DISBURSEMENT' ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {t.type === 'DISBURSEMENT' ? '-' : '+'}₹{t.amount?.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(t.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
