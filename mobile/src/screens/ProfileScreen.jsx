import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useApiConfig } from '../context/ApiConfigContext';
import {
  ErrorBanner,
  PrimaryButton,
  Screen,
  SuccessBanner,
} from '../components/ui';
import { colors } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { user, updateUser, logout } = useAuth();
  const { apiBaseUrl } = useApiConfig();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const save = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const body = { name, email };
      if (password) body.password = password;
      const res = await api.put('/auth/profile', body);
      await updateUser(res.data.user);
      setPassword('');
      setMessage('Profile updated');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView>
        <Screen title="My Profile" subtitle={user?.organizationName}>
          <View style={styles.form}>
            <ErrorBanner message={error} />
            <SuccessBanner message={message} />

            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>New password (optional)</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <PrimaryButton title="Save changes" onPress={save} loading={loading} />

            <Pressable
              style={styles.apiRow}
              onPress={() => navigation.navigate('ApiSettings')}
            >
              <View>
                <Text style={styles.apiLabel}>API URL</Text>
                <Text style={styles.apiUrl} numberOfLines={1}>{apiBaseUrl}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <PrimaryButton title="Sign out" onPress={logout} />
          </View>
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  form: { padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  apiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    padding: 14,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  apiLabel: { fontSize: 13, fontWeight: '600', color: colors.primary },
  apiUrl: { fontSize: 11, color: colors.textMuted, marginTop: 4, maxWidth: 260 },
});
