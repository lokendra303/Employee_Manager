import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from './ui';
import NotificationBell from './NotificationBell';

const navItems = {
  SYSTEM_ADMIN: [
    { to: '/', label: 'Organizations', icon: 'building' },
    { to: '/profile', label: 'My Profile', icon: 'user' },
  ],
  ADMIN: [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/workers', label: 'Workers', icon: 'workers' },
    { to: '/distributors', label: 'Projects / Sites', icon: 'briefcase' },
    { to: '/attendance', label: 'Attendance', icon: 'calendar' },
    { to: '/supervisors', label: 'Supervisors', icon: 'user' },
    { to: '/fund-requests', label: 'Fund Requests', icon: 'banknote' },
    { to: '/transactions', label: 'Payments', icon: 'card' },
    { to: '/reports', label: 'Reports', icon: 'chart' },
    { to: '/profile', label: 'My Profile', icon: 'user' },
  ],
  SUPERVISOR: [
    { to: '/', label: 'Attendance', icon: 'calendar' },
    { to: '/pay', label: 'Pay Salary', icon: 'banknote' },
    { to: '/wallet', label: 'Wallet', icon: 'wallet' },
    { to: '/fund-requests', label: 'Fund Request', icon: 'spark' },
    { to: '/transactions', label: 'Payments', icon: 'card' },
  ],
  DISTRIBUTOR: [
    { to: '/', label: 'Workers Owed', icon: 'banknote' },
    { to: '/wallet', label: 'Wallet', icon: 'wallet' },
    { to: '/fund-requests', label: 'Fund Request', icon: 'spark' },
    { to: '/transactions', label: 'Transactions', icon: 'list' },
    { to: '/reports', label: 'Reports', icon: 'chart' },
  ],
  WORKER: [{ to: '/', label: 'My Attendance', icon: 'calendar' }],
};

function getNavItems(user) {
  const base = navItems[user?.role] || [];
  if (user?.role === 'SUPERVISOR' && user?.linkedDistributorId) {
    const distributorNav = { to: '/distributor-workers', label: 'Distributor Workers', icon: 'briefcase' };
    const withoutWalletDup = base.filter((item) => item.to !== '/wallet' || true);
    return [base[0], distributorNav, ...withoutWalletDup.slice(1)];
  }
  return base;
}

function Logo({ compact }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-glow">
        <Icon name="calendar" className="w-5 h-5 text-white" />
      </div>
      {!compact && (
        <div>
          <p className="font-bold text-white text-sm leading-tight">Attendance</p>
          <p className="text-primary-300 text-xs font-medium">Manager</p>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = getNavItems(user);
  const canEditProfile = user?.role === 'ADMIN' || user?.role === 'SYSTEM_ADMIN';

  const handleLogout = () => {
    const loginPath = user?.role === 'SYSTEM_ADMIN' ? '/system-login' : '/login';
    logout();
    navigate(loginPath);
  };

  const showNotifications = user?.role !== 'SYSTEM_ADMIN';

  const roleLabel = user?.role?.replace(/_/g, ' ');

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <header className="md:hidden bg-ink-900 px-4 py-3 flex items-center justify-between sticky top-0 z-20 border-b border-white/5">
        <Logo compact />
        <div className="flex items-center gap-1">
          {showNotifications ? <NotificationBell /> : null}
          <button onClick={handleLogout} className="text-xs font-semibold text-ink-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5">
            Sign out
          </button>
        </div>
      </header>

      <aside className="hidden md:flex md:w-64 lg:w-72 md:flex-col bg-sidebar border-r border-white/5 min-h-screen sticky top-0">
        <div className="p-6 border-b border-white/5">
          <Logo />
          <div
            className={`mt-5 p-3 rounded-xl bg-white/5 border border-white/5 ${canEditProfile ? 'cursor-pointer hover:bg-white/10 transition' : ''}`}
            onClick={canEditProfile ? () => navigate('/profile') : undefined}
            onKeyDown={canEditProfile ? (e) => e.key === 'Enter' && navigate('/profile') : undefined}
            role={canEditProfile ? 'button' : undefined}
            tabIndex={canEditProfile ? 0 : undefined}
          >
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            {user?.organizationName && (
              <p className="text-xs text-ink-400 mt-0.5 truncate">{user.organizationName}</p>
            )}
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider bg-primary-500/20 text-primary-300 px-2 py-1 rounded-md border border-primary-500/20">
              {roleLabel}
              {user?.linkedDistributorId && user?.role === 'SUPERVISOR' ? ' · Distributor' : ''}
            </span>
            {canEditProfile && (
              <p className="text-[10px] text-primary-300/80 mt-2 font-medium">Edit profile →</p>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {items.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={{ animationDelay: `${i * 40}ms` }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 animate-slide-in-right ${
                  isActive ? 'nav-link-active' : 'nav-link-idle'
                }`
              }
            >
              <Icon name={item.icon} className="w-5 h-5 shrink-0 opacity-90" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          {showNotifications ? (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-ink-400 font-medium">Alerts</span>
              <NotificationBell dropUp />
            </div>
          ) : null}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-ink-300 border border-white/10 hover:bg-white/5 hover:text-white transition"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8 max-w-6xl w-full mx-auto animate-fade-in">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-ink-900/95 backdrop-blur-lg border-t border-white/10 flex justify-around py-1.5 px-1 z-20 safe-area-pb">
        {items.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl min-w-[60px] transition ${
                isActive ? 'text-primary-400' : 'text-ink-400'
              }`
            }
          >
            <Icon name={item.icon} className="w-5 h-5" />
            <span className="text-[10px] font-semibold truncate max-w-[64px]">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
