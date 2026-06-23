import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleGuard({ roles, children, requireDistributorLink = false }) {
  const { user } = useAuth();

  const hasRole = roles?.includes(user?.role);
  const hasLinkedDistributor =
    roles?.includes('DISTRIBUTOR') && (user?.actsAsDistributor || user?.linkedDistributorId);

  if (roles && !hasRole && !hasLinkedDistributor) {
    return <Navigate to="/" replace />;
  }

  if (requireDistributorLink && !user?.linkedDistributorId && user?.role !== 'DISTRIBUTOR') {
    return <Navigate to="/" replace />;
  }

  return children;
}
