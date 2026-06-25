import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export function ProtectedRoute() {
  const { user, bootstrapping } = useAuth();

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    const stored = localStorage.getItem('user');
    let loginPath = '/login';
    try {
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed?.role === 'SYSTEM_ADMIN') loginPath = '/system-login';
    } catch {
      // ignore
    }
    return <Navigate to={loginPath} replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
