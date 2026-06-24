import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography, getStatCardWidth } from '../theme';

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
      <Ionicons name="alert-circle" size={20} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.successBanner}>
      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
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
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function SectionTitle({ title, action }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function Card({ children, style, elevated = true }) {
  return (
    <View style={[styles.card, elevated && shadow('sm'), style]}>{children}</View>
  );
}

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
  rightElement,
  onFocus,
  returnKeyType,
  onSubmitEditing,
  autoCapitalize = 'none',
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, multiline && styles.inputWrapMulti]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          onFocus={onFocus}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
        {rightElement}
      </View>
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled, loading, icon }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        shadow('md'),
        (disabled || loading) && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={styles.btnInner}>
          {icon ? <Ionicons name={icon} size={20} color="#fff" /> : null}
          <Text style={styles.primaryBtnText}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, disabled, danger }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondaryBtn,
        danger && styles.secondaryDanger,
        pressed && styles.btnPressedOpacity,
        disabled && styles.btnDisabled,
      ]}
    >
      <Text style={[styles.secondaryBtnText, danger && styles.secondaryDangerText]}>{title}</Text>
    </Pressable>
  );
}

export function StatCard({ label, value, sub, icon, tone = 'default' }) {
  const { width } = useWindowDimensions();
  const cardWidth = getStatCardWidth(width);
  const toneStyles = {
    default: { bg: colors.surface, icon: colors.primarySoft, iconColor: colors.primary },
    brand: { bg: colors.primarySoft, icon: '#bfdbfe', iconColor: colors.primaryDark },
    success: { bg: colors.successSoft, icon: '#bbf7d0', iconColor: colors.success },
    warning: { bg: colors.warningSoft, icon: '#fde68a', iconColor: colors.warning },
  }[tone];

  return (
    <Card
      style={[styles.statCard, { width: cardWidth }, { backgroundColor: toneStyles.bg }]}
      elevated
    >
      <View style={styles.statTop}>
        {icon ? (
          <View style={[styles.statIcon, { backgroundColor: toneStyles.icon }]}>
            <Ionicons name={icon} size={18} color={toneStyles.iconColor} />
          </View>
        ) : null}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
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
      <Text style={styles.badgeText}>{label.replace(/_/g, ' ')}</Text>
    </View>
  );
}

export function QuickActionCard({ icon, label, sub, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickCard, pressed && styles.quickPressed]}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.quickText}>
        <Text style={styles.quickLabel}>{label}</Text>
        {sub ? <Text style={styles.quickSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  muted: { color: colors.textMuted, fontSize: 14 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { ...typography.title },
  subtitle: { ...typography.subtitle, marginTop: 4 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: Platform.OS === 'android' ? 0 : 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  field: { gap: spacing.sm },
  label: { ...typography.label },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 50,
  },
  inputWrapMulti: { alignItems: 'flex-start', minHeight: 88 },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'android' ? 10 : 14,
    fontSize: 16,
    color: colors.text,
  },
  inputMulti: { minHeight: 88, textAlignVertical: 'top', paddingTop: spacing.md },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: Platform.OS === 'android' ? 14 : 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnDisabled: { opacity: 0.55 },
  btnPressed: { backgroundColor: colors.primaryDark },
  btnPressedOpacity: { opacity: 0.88 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  secondaryDanger: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  secondaryBtnText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  secondaryDangerText: { color: colors.danger },
  statCard: { marginBottom: 0 },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', flex: 1 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 4 },
  statSub: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 14, lineHeight: 20 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  successText: { flex: 1, color: colors.success, fontSize: 14, lineHeight: 20 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  badgeSuccess: { backgroundColor: colors.successSoft },
  badgeWarning: { backgroundColor: colors.warningSoft },
  badgeDanger: { backgroundColor: colors.dangerSoft },
  badgeBrand: { backgroundColor: colors.primaryLight },
  badgeNeutral: { backgroundColor: colors.borderLight },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadow('sm'),
  },
  quickPressed: { opacity: 0.9 },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { flex: 1 },
  quickLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  quickSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
