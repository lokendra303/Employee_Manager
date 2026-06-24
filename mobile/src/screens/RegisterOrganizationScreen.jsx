import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApiConfig } from '../context/ApiConfigContext';
import ApiServerPicker from '../components/ApiServerPicker';
import api from '../api/client';
import { ErrorBanner, PrimaryButton, Screen, SuccessBanner } from '../components/ui';
import { colors } from '../theme';

const emptyForm = {
  organizationName: '',
  contactPhone: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

export default function RegisterOrganizationScreen({ navigation }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { apiBaseUrl } = useApiConfig();

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!apiBaseUrl) {
      setError('Set API URL first (tap the bar above)');
      return;
    }
    if (!form.organizationName.trim() || !form.adminName.trim() || !form.adminEmail.trim()) {
      setError('Organization name, your name, and email are required');
      return;
    }
    if (form.adminPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register-organization', {
        organizationName: form.organizationName.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
      });
      setSuccess(res.data.message);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
            <Text style={styles.title}>Register Organization</Text>
            <Text style={styles.subtitle}>
              Create your organization account. A system administrator will approve it before you
              can log in.
            </Text>
          </View>

          <View style={styles.form}>
            <ApiServerPicker
              compact
              onSaved={() => navigation.navigate('ApiSettings')}
            />

            <ErrorBanner message={error} />
            <SuccessBanner message={success} />

            <Text style={styles.label}>Organization Name</Text>
            <TextInput
              style={styles.input}
              value={form.organizationName}
              onChangeText={(organizationName) => setForm({ ...form, organizationName })}
              placeholder="Your company name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Contact Phone (optional)</Text>
            <TextInput
              style={styles.input}
              value={form.contactPhone}
              onChangeText={(contactPhone) => setForm({ ...form, contactPhone })}
              keyboardType="phone-pad"
              placeholder="Phone number"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.section}>Organization Admin (you)</Text>

            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={form.adminName}
              onChangeText={(adminName) => setForm({ ...form, adminName })}
              placeholder="Full name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Email (login)</Text>
            <TextInput
              style={styles.input}
              value={form.adminEmail}
              onChangeText={(adminEmail) => setForm({ ...form, adminEmail })}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="admin@company.com"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={form.adminPassword}
              onChangeText={(adminPassword) => setForm({ ...form, adminPassword })}
              secureTextEntry
              placeholder="Min 6 characters"
              placeholderTextColor={colors.textMuted}
            />

            <PrimaryButton
              title="Submit for Approval"
              onPress={handleSubmit}
              loading={loading}
              disabled={
                !!success ||
                !form.organizationName ||
                !form.adminName ||
                !form.adminEmail ||
                !form.adminPassword
              }
            />
          </View>

          <Pressable onPress={() => navigation.navigate('Login')} style={styles.footerLink}>
            <Text style={styles.footerText}>
              Already approved? <Text style={styles.link}>Sign in</Text>
            </Text>
          </Pressable>

          <Text style={styles.hint}>
            Supervisors cannot register directly. Your organization admin adds them after approval.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  brand: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 8, lineHeight: 20 },
  form: { gap: 8 },
  section: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
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
  footerLink: { marginTop: 24, alignItems: 'center' },
  footerText: { fontSize: 14, color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '600' },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
});
