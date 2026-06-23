import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useApiConfig } from '../context/ApiConfigContext';
import ApiServerPicker from '../components/ApiServerPicker';
import { ErrorBanner, PrimaryButton, Screen } from '../components/ui';
import { colors } from '../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const { apiBaseUrl } = useApiConfig();

  const handleSubmit = async () => {
    setError('');
    if (!apiBaseUrl) {
      setError('Set API URL first (tap the bar above)');
      return;
    }
    try {
      await login(email.trim(), password);
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

            <PrimaryButton
              title="Sign in"
              onPress={handleSubmit}
              loading={loading}
              disabled={!email || !password}
            />
          </View>

          <View style={styles.demo}>
            <Text style={styles.demoTitle}>Demo accounts</Text>
            <Text style={styles.demoLine}>Admin — admin@attendance.com / admin123</Text>
            <Text style={styles.demoLine}>Supervisor — supervisor@attendance.com / super123</Text>
            <Text style={styles.demoLine}>Distributor — distributor@attendance.com / dist123</Text>
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
  demo: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  demoTitle: { fontWeight: '600', marginBottom: 8, color: colors.text },
  demoLine: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
});
