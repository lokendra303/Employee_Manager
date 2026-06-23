import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import Login from './pages/Login';
import RegisterOrganization from './pages/RegisterOrganization';
import Dashboard from './pages/admin/Dashboard';
import Workers from './pages/admin/Workers';
import Distributors from './pages/admin/Distributors';
import DistributorDetail from './pages/admin/DistributorDetail';
import Supervisors from './pages/admin/Supervisors';
import Reports from './pages/admin/Reports';
import Attendance from './pages/supervisor/Attendance';
import SupervisorPaySalary from './pages/supervisor/PaySalary';
import DistributorHome from './pages/distributor/DistributorHome';
import Transactions from './pages/shared/Transactions';
import FundRequestsPage from './pages/FundRequestsPage';
import Wallet from './pages/shared/Wallet';
import WorkerProfile from './pages/shared/WorkerProfile';
import Profile from './pages/shared/Profile';
import SystemAdmin from './pages/system/SystemAdmin';
import { useParams } from 'react-router-dom';

function DistributorDetailWrapper() {
  const { id } = useParams();
  return <DistributorDetail distributorId={id} />;
}

function RoleHome() {
  const { user } = useAuth();
  if (user?.role === 'SYSTEM_ADMIN') return <SystemAdmin />;
  if (user?.role === 'SUPERVISOR') return <Attendance />;
  if (user?.role === 'DISTRIBUTOR') return <DistributorHome />;
  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterOrganization />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<RoleHome />} />

            <Route
              path="/workers"
              element={
                <RoleGuard roles={['ADMIN']}>
                  <Workers />
                </RoleGuard>
              }
            />
            <Route
              path="/workers/:id"
              element={
                <RoleGuard roles={['ADMIN', 'SUPERVISOR', 'DISTRIBUTOR']}>
                  <WorkerProfile />
                </RoleGuard>
              }
            />
            <Route
              path="/distributors"
              element={
                <RoleGuard roles={['ADMIN']}>
                  <Distributors />
                </RoleGuard>
              }
            />
            <Route
              path="/distributors/:id"
              element={
                <RoleGuard roles={['ADMIN']}>
                  <DistributorDetailWrapper />
                </RoleGuard>
              }
            />
            <Route
              path="/supervisors"
              element={
                <RoleGuard roles={['ADMIN']}>
                  <Supervisors />
                </RoleGuard>
              }
            />
            <Route
              path="/fund-requests"
              element={
                <RoleGuard roles={['ADMIN', 'DISTRIBUTOR', 'SUPERVISOR']}>
                  <FundRequestsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/wallet"
              element={
                <RoleGuard roles={['DISTRIBUTOR', 'SUPERVISOR']}>
                  <Wallet />
                </RoleGuard>
              }
            />
            <Route
              path="/attendance"
              element={
                <RoleGuard roles={['ADMIN', 'SUPERVISOR']}>
                  <Attendance />
                </RoleGuard>
              }
            />
            <Route
              path="/pay"
              element={
                <RoleGuard roles={['ADMIN', 'SUPERVISOR']}>
                  <SupervisorPaySalary />
                </RoleGuard>
              }
            />
            <Route
              path="/transactions"
              element={
                <RoleGuard roles={['ADMIN', 'SUPERVISOR', 'DISTRIBUTOR']}>
                  <Transactions />
                </RoleGuard>
              }
            />
            <Route
              path="/distributor-workers"
              element={
                <RoleGuard roles={['DISTRIBUTOR', 'SUPERVISOR']} requireDistributorLink>
                  <DistributorHome />
                </RoleGuard>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleGuard roles={['ADMIN', 'DISTRIBUTOR']}>
                  <Reports />
                </RoleGuard>
              }
            />
            <Route
              path="/profile"
              element={
                <RoleGuard roles={['ADMIN', 'SYSTEM_ADMIN']}>
                  <Profile />
                </RoleGuard>
              }
            />
            <Route
              path="/system"
              element={
                <RoleGuard roles={['SYSTEM_ADMIN']}>
                  <SystemAdmin />
                </RoleGuard>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
