import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme';

export function LoadingView({ label = 'Loading...' }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.successBanner}>
      <Text style={styles.successText}>{message}</Text>
    </View>
  );
}

export function Screen({ children, title, subtitle }) {
  return (
    <View style={styles.screen}>
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({ title, onPress, disabled, loading }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        (disabled || loading) && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryBtnText}>{title}</Text>
      )}
    </Pressable>
  );
}

export function StatCard({ label, value, sub }) {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </Card>
  );
}

export function Badge({ label, tone = 'neutral' }) {
  const toneStyle = {
    success: styles.badgeSuccess,
    warning: styles.badgeWarning,
    danger: styles.badgeDanger,
    brand: styles.badgeBrand,
    neutral: styles.badgeNeutral,
  }[tone];

  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  muted: { color: colors.textMuted, fontSize: 14 },
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnPressed: { backgroundColor: colors.primaryDark },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  statCard: { flex: 1, minWidth: '45%' },
  statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 4 },
  statSub: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: colors.danger, fontSize: 14 },
  successBanner: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  successText: { color: colors.success, fontSize: 14 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeWarning: { backgroundColor: '#fef3c7' },
  badgeDanger: { backgroundColor: '#fee2e2' },
  badgeBrand: { backgroundColor: '#dbeafe' },
  badgeNeutral: { backgroundColor: '#f1f5f9' },
});
