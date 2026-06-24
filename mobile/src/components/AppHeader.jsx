import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NotificationBell from './NotificationBell';
import { colors, spacing, typography } from '../theme';

export default function AppHeader({
  title,
  subtitle,
  showNotifications = true,
  onNotificationsPress,
  rightAction,
  dark = false,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        dark && styles.wrapDark,
        { paddingTop: Math.max(insets.top, spacing.sm) },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.textBlock}>
          {title ? (
            <Text style={[styles.title, dark && styles.titleDark]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={[styles.subtitle, dark && styles.subtitleDark]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          {rightAction}
          {showNotifications && onNotificationsPress ? (
            <NotificationBell onPress={onNotificationsPress} light={dark} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function ListRow({ icon, label, sublabel, onPress, danger, chevron = true }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, danger && styles.rowDanger]}
    >
      {icon ? (
        <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
          <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSub}>{sublabel}</Text> : null}
      </View>
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  wrapDark: {
    backgroundColor: colors.header,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: spacing.sm,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  textBlock: { flex: 1 },
  title: { ...typography.title },
  titleDark: { color: colors.headerText },
  subtitle: { ...typography.subtitle, marginTop: 4 },
  subtitleDark: { color: 'rgba(255,255,255,0.75)' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rowPressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  rowDanger: { borderColor: '#fecaca', backgroundColor: '#fffbfb' },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: colors.dangerSoft },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowLabelDanger: { color: colors.danger },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
