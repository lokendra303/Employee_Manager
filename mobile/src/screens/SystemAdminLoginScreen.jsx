import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useApiConfig } from '../context/ApiConfigContext';
import ApiServerPicker from '../components/ApiServerPicker';
import AuthFormScroll from '../components/AuthFormScroll';
import { FadeInUp, MeshBackground } from '../components/motion';
import { setApiBaseUrl } from '../api/client';
import { normalizeApiUrl } from '../constants/apiStorage';
import {
  Card,
  ErrorBanner,
  InputField,
  PrimaryButton,
} from '../components/ui';
import { AUTH_LAST_EMAIL_KEY, AUTH_REMEMBER_KEY } from '../constants/authStorage';
import { colors, gradients, radius, shadow, spacing, typography } from '../theme';

export default function SystemAdminLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const { login, loading, logout } = useAuth();
  const { inputUrl, saveApiUrl, testUrl } = useApiConfig();
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

  const handleSubmit = async () => {
    setError('');
    if (!inputUrl?.trim()) {
      setError('Enter the API URL below before signing in');
      return;
    }
    try {
      const url = normalizeApiUrl(inputUrl);
      setApiBaseUrl(url);
      await testUrl(url);

      const loggedInUser = await login(email.trim(), password, rememberMe);
      if (loggedInUser?.role !== 'SYSTEM_ADMIN') {
        await logout();
        setError('This page is for system administrators only');
        return;
      }

      try {
        await saveApiUrl(url, { saveToServer: true });
      } catch (saveErr) {
        await logout();
        setError(`Could not save global API URL: ${saveErr.message}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1e293b', '#134e4a', '#0f172a']} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <MeshBackground variant="dark" />
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <FadeInUp>
          <View style={styles.logoRing}>
            <LinearGradient colors={['#475569', '#334155']} style={styles.logo}>
              <Ionicons name="shield-checkmark" size={32} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.appName}>System Administrator</Text>
          <Text style={styles.tagline}>Configure API & manage organizations</Text>
        </FadeInUp>
      </LinearGradient>

      <AuthFormScroll scrollRef={scrollRef} contentContainerStyle={styles.scrollContent}>
          <Card style={styles.formCard} elevated>
            <Text style={styles.formTitle}>API server</Text>
            <Text style={styles.formSub}>
              This URL is saved for all devices. Every user app will use it automatically.
            </Text>

            <ApiServerPicker embedded showTestButton />

            <Text style={[styles.formTitle, { marginTop: spacing.md }]}>Sign in</Text>
            <ErrorBanner message={error} />

            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="system@attendance.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              rightElement={
                <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn} hitSlop={8}>
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
              </View>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </View>

            <PrimaryButton
              title="Save API & sign in"
              icon="shield-checkmark-outline"
              onPress={handleSubmit}
              loading={loading}
              disabled={!email || !password || !inputUrl?.trim()}
            />
          </Card>
      </AuthFormScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: {
    alignItems: 'center',
    paddingBottom: spacing.xl + 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  backBtn: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.lg + 8,
    padding: spacing.sm,
    zIndex: 2,
  },
  logoRing: {
    padding: 3,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: spacing.md,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow('lg'),
  },
  appName: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5, textAlign: 'center' },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 6, textAlign: 'center', paddingHorizontal: spacing.lg },
  scrollContent: { paddingHorizontal: spacing.md, marginTop: -32 },
  formCard: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.glass,
    ...shadow('lg'),
  },
  formTitle: { ...typography.title, fontSize: 18 },
  formSub: { ...typography.subtitle, marginTop: -4 },
  eyeBtn: { paddingHorizontal: spacing.md, paddingVertical: 12 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  rememberText: { flex: 1 },
  rememberLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
});
