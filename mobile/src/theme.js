import { Platform } from 'react-native';

export const colors = {
  primary: '#0d9488',
  primaryDark: '#0f766e',
  primaryLight: '#ccfbf1',
  primarySoft: '#f0fdfa',
  accent: '#2dd4bf',
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  success: '#059669',
  successSoft: '#d1fae5',
  warning: '#d97706',
  warningSoft: '#fef3c7',
  danger: '#e11d48',
  dangerSoft: '#ffe4e6',
  present: '#22c55e',
  halfDay: '#eab308',
  absent: '#ef4444',
  header: '#0f172a',
  headerEnd: '#134e4a',
  headerText: '#ffffff',
  glass: 'rgba(255,255,255,0.92)',
};

export const gradients = {
  primary: ['#0d9488', '#14b8a6', '#0f766e'],
  hero: ['#0f172a', '#134e4a', '#115e59'],
  card: ['#ffffff', '#f8fafc'],
  success: ['#059669', '#10b981'],
  danger: ['#e11d48', '#f43f5e'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const typography = {
  hero: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  body: { fontSize: 15, color: colors.textSecondary, lineHeight: 23 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.2 },
  caption: { fontSize: 12, color: colors.textMuted },
};

const iosShadows = {
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  lg: {
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  glow: {
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
};

const androidElevations = { sm: 2, md: 6, lg: 12, glow: 8 };

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
  height: Platform.OS === 'android' ? 68 : 62,
  paddingBottom: Platform.OS === 'android' ? 10 : 6,
  paddingTop: 6,
  borderTopWidth: 0,
  ...shadow('lg'),
};
