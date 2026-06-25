import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeInUp, MeshBackground } from './motion';
import NotificationBell from './NotificationBell';
import { colors, gradients, radius, shadow, spacing, typography } from '../theme';

export default function AppHeader({
  title,
  subtitle,
  showNotifications = true,
  onNotificationsPress,
  rightAction,
  dark = false,
}) {
  const insets = useSafeAreaInsets();

  if (dark) {
    return (
      <LinearGradient
        colors={gradients.hero}
        style={[styles.wrapDark, { paddingTop: Math.max(insets.top, spacing.sm) }]}
      >
        <MeshBackground variant="dark" />
        <FadeInUp>
          <View style={styles.inner}>
            <View style={styles.textBlock}>
              {title ? (
                <Text style={styles.titleDark} numberOfLines={1}>{title}</Text>
              ) : null}
              {subtitle ? (
                <Text style={styles.subtitleDark} numberOfLines={2}>{subtitle}</Text>
              ) : null}
            </View>
            <View style={styles.actions}>
              {rightAction}
              {showNotifications && onNotificationsPress ? (
                <NotificationBell onPress={onNotificationsPress} light />
              ) : null}
            </View>
          </View>
        </FadeInUp>
        <LinearGradient
          colors={['transparent', 'rgba(15, 23, 42, 0.03)']}
          style={styles.headerFade}
          pointerEvents="none"
        />
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
      <FadeInUp>
        <View style={styles.inner}>
          <View style={styles.textBlock}>
            {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
          </View>
          <View style={styles.actions}>
            {rightAction}
            {showNotifications && onNotificationsPress ? (
              <NotificationBell onPress={onNotificationsPress} />
            ) : null}
          </View>
        </View>
      </FadeInUp>
    </View>
  );
}

export function ListRow({ icon, label, sublabel, onPress, danger, chevron = true, delay = 0 }) {
  return (
    <FadeInUp delay={delay}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, shadow('sm'), pressed && styles.rowPressed, danger && styles.rowDanger]}
      >
        {icon ? (
          <LinearGradient
            colors={danger ? ['#fff1f2', '#ffe4e6'] : ['#f0fdfa', '#ccfbf1']}
            style={[styles.rowIcon, danger && styles.rowIconDanger]}
          >
            <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
          </LinearGradient>
        ) : null}
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
          {sublabel ? <Text style={styles.rowSub}>{sublabel}</Text> : null}
        </View>
        {chevron ? (
          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        ) : null}
      </Pressable>
    </FadeInUp>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: 'transparent',
  },
  wrapDark: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg + 4,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadow('lg'),
  },
  headerFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    zIndex: 1,
  },
  textBlock: { flex: 1 },
  title: { ...typography.title, fontSize: 24 },
  titleDark: { ...typography.title, fontSize: 24, color: colors.headerText },
  subtitle: { ...typography.subtitle, marginTop: 4 },
  subtitleDark: { ...typography.subtitle, marginTop: 4, color: 'rgba(255,255,255,0.78)' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
  },
  rowPressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  rowDanger: { borderColor: '#fecaca', backgroundColor: '#fffbfb' },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: {},
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowLabelDanger: { color: colors.danger },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
