import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useApiConfig } from '../context/ApiConfigContext';
import ApiServerPicker from '../components/ApiServerPicker';
import { ErrorBanner, PrimaryButton, Screen } from '../components/ui';
import { AUTH_LAST_EMAIL_KEY, AUTH_REMEMBER_KEY } from '../constants/authStorage';
import { colors } from '../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const { apiBaseUrl } = useApiConfig();

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
      setError('Set API URL first (tap the bar above)');
      return;
    }
    try {
      await login(email.trim(), password, rememberMe);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>AM</Text>
            </View>
            <Text style={styles.appName}>Attendance Manager</Text>
            <Text style={styles.tagline}>Sign in to continue</Text>
          </View>

          <View style={styles.form}>
            <ApiServerPicker
              compact
              onSaved={() => navigation.navigate('ApiSettings')}
            />

            <ErrorBanner message={error} />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@company.com"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.rememberRow}>
              <View style={styles.rememberText}>
                <Text style={styles.rememberLabel}>Keep me signed in on this device</Text>
                <Text style={styles.rememberHint}>
                  Stay logged in until you sign out. Uncheck for a one-time session only.
                </Text>
              </View>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <PrimaryButton
              title="Sign in"
              onPress={handleSubmit}
              loading={loading}
              disabled={!email || !password}
            />

            <Pressable
              onPress={() => navigation.navigate('Register')}
              style={styles.registerLink}
            >
              <Text style={styles.registerText}>
                New organization? <Text style={styles.registerCta}>Register here</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: 32 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: { color: '#fff', fontWeight: '700', fontSize: 20 },
  appName: { fontSize: 22, fontWeight: '700', color: colors.text },
  tagline: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  form: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: colors.text,
  },
  registerLink: { marginTop: 16, alignItems: 'center' },
  registerText: { fontSize: 14, color: colors.textMuted },
  registerCta: { color: colors.primary, fontWeight: '600' },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    gap: 12,
  },
  rememberText: { flex: 1 },
  rememberLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  rememberHint: { fontSize: 11, color: colors.textMuted, marginTop: 4, lineHeight: 15 },
});
