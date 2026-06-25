import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useApiConfig } from '../context/ApiConfigContext';
import AuthFormScroll from '../components/AuthFormScroll';
import { FadeInUp, MeshBackground } from '../components/motion';
import {
  Card,
  ErrorBanner,
  InputField,
  PrimaryButton,
} from '../components/ui';
import { AUTH_LAST_EMAIL_KEY, AUTH_REMEMBER_KEY } from '../constants/authStorage';
import { colors, gradients, radius, shadow, spacing, typography } from '../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const { apiBaseUrl, configError, bootstrapping } = useApiConfig();
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
    if (!apiBaseUrl) {
      setError(configError || 'Server not configured. Contact your system administrator.');
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
      <LinearGradient colors={gradients.hero} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <MeshBackground variant="dark" />
        <FadeInUp delay={0}>
          <View style={styles.logoRing}>
            <LinearGradient colors={gradients.primary} style={styles.logo}>
              <Ionicons name="calendar" size={34} color="#fff" />
            </LinearGradient>
          </View>
        </FadeInUp>
        <FadeInUp delay={100}>
          <Text style={styles.appName}>Attendance Manager</Text>
          <Text style={styles.tagline}>Workforce pay & attendance</Text>
        </FadeInUp>
      </LinearGradient>

      <AuthFormScroll scrollRef={scrollRef} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.formCard} elevated>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSub}>Sign in to your account</Text>

          {!bootstrapping && !apiBaseUrl ? (
            <View style={styles.configWarn}>
              <Ionicons name="cloud-offline-outline" size={20} color="#c2410c" />
              <Text style={styles.configWarnText}>
                {configError || 'Server URL not configured yet.'}
              </Text>
            </View>
          ) : null}

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
            disabled={!email || !password || !apiBaseUrl}
          />

          <Pressable onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
            <Text style={styles.registerText}>
              New organization? <Text style={styles.registerCta}>Register</Text>
            </Text>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('SystemAdminLogin')} style={styles.adminLink}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
            <Text style={styles.adminLinkText}>System administrator sign in</Text>
          </Pressable>
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
    ...shadow('glow'),
  },
  appName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.6 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginTop: 8 },
  scrollContent: { paddingHorizontal: spacing.md, marginTop: -32 },
  formCard: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.glass,
    ...shadow('lg'),
  },
  formTitle: { ...typography.title, fontSize: 22 },
  formSub: { ...typography.subtitle, marginTop: -4 },
  configWarn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fff7ed',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: spacing.md,
  },
  configWarnText: { flex: 1, fontSize: 13, color: '#c2410c', lineHeight: 18 },
  eyeBtn: { paddingHorizontal: spacing.md, paddingVertical: 12 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  rememberText: { flex: 1 },
  rememberLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  rememberHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  registerLink: { alignItems: 'center', paddingTop: spacing.sm },
  registerText: { fontSize: 14, color: colors.textMuted },
  registerCta: { color: colors.primary, fontWeight: '700' },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: spacing.xs,
  },
  adminLinkText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
});
