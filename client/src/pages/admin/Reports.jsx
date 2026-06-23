import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function Reports() {
  const [daysReport, setDaysReport] = useState(null);
  const [reconciliation, setReconciliation] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/days-worked'),
      api.get('/reports/distributor-reconciliation').catch(() => ({ data: [] })),
    ])
      .then(([daysRes, reconRes]) => {
        setDaysReport(daysRes.data);
        setReconciliation(reconRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Reports</h2>

      <div className="card">
        <h3 className="font-semibold mb-3">
          Days Worked ({daysReport?.from} → {daysReport?.to})
        </h3>
        <div className="space-y-3 md:hidden">
          {daysReport?.report?.map((r) => (
            <div key={r.workerId} className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{r.workerName}</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>Present: {r.presentDays}</div>
                <div>Half: {r.halfDays}</div>
                <div>Effective: {r.effectiveDays}</div>
                <div className="font-semibold text-emerald-700">Paid: ₹{r.totalPaid?.toLocaleString()}</div>
                <div className="col-span-2 font-semibold text-amber-700">
                  Pending: ₹{r.totalPending?.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 pr-4">Worker</th>
                <th className="pb-2 pr-4">Present</th>
                <th className="pb-2 pr-4">Half Days</th>
                <th className="pb-2 pr-4">Effective Days</th>
                <th className="pb-2 pr-4">Paid</th>
                <th className="pb-2">Pending Payment</th>
              </tr>
            </thead>
            <tbody>
              {daysReport?.report?.map((r) => (
                <tr key={r.workerId} className="border-b">
                  <td className="py-2 pr-4">{r.workerName}</td>
                  <td className="py-2 pr-4">{r.presentDays}</td>
                  <td className="py-2 pr-4">{r.halfDays}</td>
                  <td className="py-2 pr-4">{r.effectiveDays}</td>
                  <td className="py-2 pr-4 font-medium text-emerald-700">
                    ₹{r.totalPaid?.toLocaleString()}
                  </td>
                  <td className="py-2 font-medium text-amber-700">
                    ₹{r.totalPending?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {reconciliation.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3">Distributor Reconciliation</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {reconciliation.map((d) => (
              <div key={d.id} className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{d.name}</p>
                <div className="mt-2 text-sm space-y-1">
                  <p>Credits: ₹{d.totalCredits?.toLocaleString()}</p>
                  <p>Paid out: ₹{d.totalDisbursements?.toLocaleString()}</p>
                  <p className="font-semibold text-primary-700">Balance: ₹{d.balance?.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
