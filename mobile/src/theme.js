import { Platform } from 'react-native';

export const colors = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#dbeafe',
  primarySoft: '#eff6ff',
  background: '#f1f5f9',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  success: '#16a34a',
  successSoft: '#dcfce7',
  warning: '#d97706',
  warningSoft: '#fef3c7',
  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  present: '#22c55e',
  halfDay: '#eab308',
  absent: '#ef4444',
  header: '#0f172a',
  headerText: '#ffffff',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const typography = {
  hero: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  body: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  caption: { fontSize: 12, color: colors.textMuted },
};

const iosShadows = {
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
};

const androidElevations = { sm: 2, md: 4, lg: 8 };

export function shadow(level = 'md') {
  if (Platform.OS === 'android') {
    return { elevation: androidElevations[level] || 4 };
  }
  return iosShadows[level] || iosShadows.md;
}

export function getStatCardWidth(screenWidth, horizontalPadding = spacing.md) {
  const gap = spacing.md;
  const available = screenWidth - horizontalPadding * 2;
  if (available >= 560) return (available - gap * 2) / 3;
  if (available >= 340) return (available - gap) / 2;
  return available;
}

export const tabBarStyle = {
  height: Platform.OS === 'android' ? 64 : 58,
  paddingBottom: Platform.OS === 'android' ? 8 : 4,
  ...shadow('lg'),
};
