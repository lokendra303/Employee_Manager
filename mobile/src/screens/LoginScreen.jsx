import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useApiConfig } from '../context/ApiConfigContext';
import ApiServerPicker from '../components/ApiServerPicker';
import {
  Card,
  ErrorBanner,
  InputField,
  PrimaryButton,
} from '../components/ui';
import { AUTH_LAST_EMAIL_KEY, AUTH_REMEMBER_KEY } from '../constants/authStorage';
import { colors, radius, shadow, spacing, typography } from '../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const { apiBaseUrl } = useApiConfig();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [savedEmail, savedRemember] = await Promise.all([
        AsyncStorage.getItem(AUTH_LAST_EMAIL_KEY),
        AsyncStorage.getItem(AUTH_REMEMBER_KEY),
      ]);
      if (savedEmail) setEmail(savedEmail);
      if (savedRemember === 'false') setRememberMe(false);
    })();
  }, []);

  const scrollToPassword = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!apiBaseUrl) {
      setError('Set API URL first (tap the server bar below)');
      return;
    }
    try {
      await login(email.trim(), password, rememberMe);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.logoRing}>
          <View style={styles.logo}>
            <Ionicons name="calendar" size={32} color="#fff" />
          </View>
        </View>
        <Text style={styles.appName}>Attendance Manager</Text>
        <Text style={styles.tagline}>Workforce pay & attendance</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.formCard} elevated>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSub}>Sign in to your account</Text>

          <ApiServerPicker compact onSaved={() => navigation.navigate('ApiSettings')} />
          <ErrorBanner message={error} />

          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            keyboardType="email-address"
            returnKeyType="next"
            autoCapitalize="none"
          />

          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry={!showPassword}
            onFocus={scrollToPassword}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            rightElement={
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textMuted}
                />
              </Pressable>
            }
          />

          <View style={styles.rememberRow}>
            <View style={styles.rememberText}>
              <Text style={styles.rememberLabel}>Keep me signed in</Text>
              <Text style={styles.rememberHint}>Stay logged in on this device</Text>
            </View>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            />
          </View>

          <PrimaryButton
            title="Sign in"
            icon="log-in-outline"
            onPress={handleSubmit}
            loading={loading}
            disabled={!email || !password}
          />

          <Pressable onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
            <Text style={styles.registerText}>
              New organization? <Text style={styles.registerCta}>Register</Text>
            </Text>
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.header,
    alignItems: 'center',
    paddingBottom: spacing.xl + 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  logoRing: {
    padding: 4,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: spacing.md,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow('lg'),
  },
  appName: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  scroll: { flex: 1, marginTop: -28 },
  scrollContent: { paddingHorizontal: spacing.md },
  formCard: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.xl,
    ...shadow('lg'),
  },
  formTitle: { ...typography.title, fontSize: 20 },
  formSub: { ...typography.subtitle, marginTop: -4 },
  eyeBtn: { paddingHorizontal: spacing.md, paddingVertical: 12 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  rememberText: { flex: 1 },
  rememberLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  rememberHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  registerLink: { alignItems: 'center', paddingTop: spacing.sm },
  registerText: { fontSize: 14, color: colors.textMuted },
  registerCta: { color: colors.primary, fontWeight: '700' },
});
