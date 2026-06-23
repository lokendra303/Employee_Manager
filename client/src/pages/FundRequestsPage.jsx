import { useAuth } from '../context/AuthContext';
import AdminFundRequests from './admin/FundRequests';
import RequesterFundRequests from './shared/RequesterFundRequests';

export default function FundRequestsPage() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminFundRequests />;
  return <RequesterFundRequests />;
}
