const iconProps = { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, viewBox: '0 0 24 24' };

export function Icon({ name, className = 'w-5 h-5' }) {
  const paths = {
    dashboard: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    workers: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    briefcase: <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    banknote: <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />,
    card: <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
    chart: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    wallet: <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
    list: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />,
    building: <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    cash: <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />,
    phone: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />,
    bank: <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />,
    arrow: <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,
    alert: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
    spark: <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />,
    bell: <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  };

  return (
    <svg {...iconProps} className={className}>
      {paths[name]}
    </svg>
  );
}

export function PageHeader({ title, subtitle, action, badge }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        {badge && (
          <span className="chip bg-primary-100 text-primary-700 mb-2">{badge}</span>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-ink-500 mt-1.5 text-sm sm:text-base max-w-xl">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

const STAT_VARIANTS = {
  default: {
    wrap: 'bg-white border-ink-100',
    icon: 'bg-ink-100 text-ink-600',
    value: 'text-ink-900',
  },
  brand: {
    wrap: 'bg-gradient-to-br from-primary-50 to-white border-primary-100/80',
    icon: 'bg-primary-100 text-primary-700',
    value: 'text-primary-800',
  },
  success: {
    wrap: 'bg-gradient-to-br from-emerald-50 to-white border-emerald-100/80',
    icon: 'bg-emerald-100 text-emerald-700',
    value: 'text-emerald-800',
  },
  warning: {
    wrap: 'bg-gradient-to-br from-amber-50 to-white border-amber-100/80',
    icon: 'bg-amber-100 text-amber-700',
    value: 'text-amber-800',
  },
  danger: {
    wrap: 'bg-gradient-to-br from-orange-50 to-white border-orange-100/80',
    icon: 'bg-orange-100 text-orange-700',
    value: 'text-orange-800',
  },
};

export function StatCard({ label, value, sub, icon, variant = 'default' }) {
  const v = STAT_VARIANTS[variant] || STAT_VARIANTS.default;
  return (
    <div className={`card p-4 sm:p-5 border ${v.wrap}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</p>
          <p className={`text-2xl sm:text-3xl font-bold mt-1.5 tabular-nums ${v.value}`}>{value}</p>
          {sub && <p className="text-xs text-ink-400 mt-1">{sub}</p>}
        </div>
        {icon && (
          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${v.icon}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function Alert({ type = 'info', children }) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200/80 text-emerald-800',
    error: 'bg-rose-50 border-rose-200/80 text-rose-800',
    warning: 'bg-amber-50 border-amber-200/80 text-amber-900',
    info: 'bg-primary-50 border-primary-200/80 text-primary-800',
  };
  const icons = { success: 'check', error: 'alert', warning: 'alert', info: 'spark' };

  return (
    <div className={`flex gap-3 items-start px-4 py-3.5 rounded-xl border text-sm ${styles[type]}`}>
      <Icon name={icons[type]} className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-600',
    brand: 'bg-primary-100 text-primary-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-rose-100 text-rose-700',
    purple: 'bg-violet-100 text-violet-700',
  };
  return (
    <span className={`chip normal-case tracking-normal ${tones[tone]}`}>{children}</span>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="card text-center py-12 px-6">
      <div className="w-14 h-14 rounded-2xl bg-ink-100 flex items-center justify-center mx-auto mb-4">
        <Icon name="workers" className="w-7 h-7 text-ink-400" />
      </div>
      <p className="font-semibold text-ink-700">{title}</p>
      {description && <p className="text-sm text-ink-500 mt-1">{description}</p>}
    </div>
  );
}

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-10 h-10 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
      <p className="text-sm text-ink-500 font-medium">{label}</p>
    </div>
  );
}

export function Avatar({ name, size = 'md' }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const sizes = { sm: 'w-9 h-9 text-sm', md: 'w-11 h-11 text-base', lg: 'w-14 h-14 text-lg' };
  return (
    <div
      className={`${sizes[size]} rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white font-bold flex items-center justify-center shadow-soft shrink-0`}
    >
      {initial}
    </div>
  );
}
