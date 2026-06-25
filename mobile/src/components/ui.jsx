import { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FadeInUp, PulseLoader, webGradient } from './motion';
import { colors, gradients, radius, shadow, spacing, typography, getStatCardWidth } from '../theme';

export function LoadingView({ label = 'Loading...' }) {
  return <PulseLoader label={label} />;
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <View style={styles.bannerIconWrapDanger}>
        <Ionicons name="alert-circle" size={18} color={colors.danger} />
      </View>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.successBanner}>
      <View style={styles.bannerIconWrapSuccess}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
      </View>
      <Text style={styles.successText}>{message}</Text>
    </View>
  );
}

export function Screen({ children, title, subtitle }) {
  return (
    <View style={styles.screen}>
      {title ? (
        <FadeInUp>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </FadeInUp>
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function SectionTitle({ title, action }) {
  return (
    <FadeInUp delay={80}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
    </FadeInUp>
  );
}

export function Card({ children, style, elevated = true, animated = false }) {
  const inner = (
    <View style={[styles.card, elevated && shadow('md'), style]}>{children}</View>
  );
  return animated ? <FadeInUp>{inner}</FadeInUp> : inner;
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
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused, multiline && styles.inputWrapMulti]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={() => setFocused(false)}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          blurOnSubmit={returnKeyType !== 'next'}
        />
        {rightElement}
      </View>
    </View>
  );
}
export function PrimaryButton({ title, onPress, disabled, loading, icon }) {
  const content = loading ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <View style={styles.btnInner}>
      {icon ? <Ionicons name={icon} size={20} color="#fff" /> : null}
      <Text style={styles.primaryBtnText}>{title}</Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtnOuter,
        shadow('glow'),
        (disabled || loading) && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
    >
      <LinearGradient
        colors={disabled ? [colors.border, colors.borderLight] : gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.primaryBtn, webGradient.primaryButton]}
      >
        {content}
      </LinearGradient>
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

export function StatCard({ label, value, sub, icon, tone = 'default', delay = 0 }) {
  const { width } = useWindowDimensions();
  const cardWidth = getStatCardWidth(width);
  const toneStyles = {
    default: { colors: ['#ffffff', '#f8fafc'], icon: colors.primarySoft, iconColor: colors.primary, accent: colors.primary },
    brand: { colors: ['#f0fdfa', '#ccfbf1'], icon: '#99f6e4', iconColor: colors.primaryDark, accent: colors.primaryDark },
    success: { colors: ['#ecfdf5', '#d1fae5'], icon: '#a7f3d0', iconColor: colors.success, accent: colors.success },
    warning: { colors: ['#fffbeb', '#fef3c7'], icon: '#fde68a', iconColor: colors.warning, accent: colors.warning },
  }[tone];

  return (
    <FadeInUp delay={delay} style={{ width: cardWidth }}>
      <LinearGradient colors={toneStyles.colors} style={[styles.statCard, shadow('sm')]}>
        <View style={[styles.statAccent, { backgroundColor: toneStyles.accent }]} />
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
      </LinearGradient>
    </FadeInUp>
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

export function QuickActionCard({ icon, label, sub, onPress, delay = 0 }) {
  return (
    <FadeInUp delay={delay}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.quickCard, shadow('sm'), pressed && styles.quickPressed]}>
        <LinearGradient colors={['#f0fdfa', '#ffffff']} style={styles.quickIcon}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </LinearGradient>
        <View style={styles.quickText}>
          <Text style={styles.quickLabel}>{label}</Text>
          {sub ? <Text style={styles.quickSub}>{sub}</Text> : null}
        </View>
        <View style={styles.quickChevron}>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </Pressable>
    </FadeInUp>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: spacing.xs,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: Platform.OS === 'android' ? 0 : 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    padding: spacing.md,
    overflow: 'hidden',
  },
  field: { gap: spacing.sm },
  label: { ...typography.label },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 52,
  },
  inputWrapFocused: {
    borderColor: colors.primary,
    backgroundColor: '#feffff',
    ...(Platform.OS === 'ios' ? shadow('sm') : {}),
  },
  inputWrapMulti: { alignItems: 'flex-start', minHeight: 96 },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    fontSize: 16,
    color: colors.text,
  },
  inputMulti: { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing.md },
  primaryBtnOuter: { borderRadius: radius.md, overflow: 'hidden' },
  primaryBtn: {
    borderRadius: radius.md,
    paddingVertical: Platform.OS === 'android' ? 15 : 17,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  btnPressedOpacity: { opacity: 0.88 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.2 },
  secondaryBtn: {
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  secondaryDanger: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  secondaryBtnText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  secondaryDangerText: { color: colors.danger },
  statCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  statAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, opacity: 0.85 },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', flex: 1, textTransform: 'uppercase', letterSpacing: 0.6 },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 2, letterSpacing: -0.5 },
  statSub: { fontSize: 11, color: colors.textMuted, marginTop: 6, fontWeight: '500' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  bannerIconWrapDanger: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: { flex: 1, color: '#be123c', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  bannerIconWrapSuccess: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: { flex: 1, color: '#047857', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
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
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  quickPressed: { opacity: 0.94, transform: [{ scale: 0.99 }] },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { flex: 1 },
  quickLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  quickSub: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  quickChevron: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
