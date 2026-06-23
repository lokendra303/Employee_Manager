import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApiConfig } from '../context/ApiConfigContext';
import {
  ErrorBanner,
  PrimaryButton,
  Screen,
  SuccessBanner,
} from './ui';
import { colors } from '../theme';

export default function ApiServerPicker({ onSaved, compact = false }) {
  const {
    apiBaseUrl,
    inputUrl,
    setInputUrl,
    testing,
    saving,
    saveApiUrl,
    testUrl,
  } = useApiConfig();

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleTest = async () => {
    setError('');
    setMessage('');
    try {
      await testUrl(inputUrl);
      setMessage('Connection successful');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSave = async () => {
    setError('');
    setMessage('');
    try {
      await saveApiUrl(inputUrl);
      setMessage('API URL saved');
      onSaved?.();
    } catch (err) {
      setError(err.message);
    }
  };

  if (compact) {
    return (
      <Pressable style={styles.compact} onPress={onSaved}>
        <View style={styles.compactLeft}>
          <Ionicons name="server-outline" size={18} color={colors.primary} />
          <View style={styles.compactText}>
            <Text style={styles.compactLabel}>API URL</Text>
            <Text style={styles.compactUrl} numberOfLines={1}>
              {apiBaseUrl || 'Not set — tap to enter'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Screen title="API URL" subtitle="Enter your backend URL and save">
        {apiBaseUrl ? (
          <View style={styles.current}>
            <Text style={styles.currentLabel}>Currently using</Text>
            <Text style={styles.currentUrl}>{apiBaseUrl}</Text>
          </View>
        ) : null}

        <ErrorBanner message={error} />
        <SuccessBanner message={message} />

        <View style={styles.field}>
          <Text style={styles.label}>API base URL</Text>
          <TextInput
            style={styles.input}
            value={inputUrl}
            onChangeText={setInputUrl}
            placeholder="http://192.168.1.100:5000/api/v1"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>
            Type the full URL you use in Postman or browser, then save.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.testBtn}
            onPress={handleTest}
            disabled={testing || saving || !inputUrl.trim()}
          >
            {testing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.testBtnText}>Test connection</Text>
            )}
          </Pressable>
          <PrimaryButton
            title="Save"
            onPress={handleSave}
            loading={saving}
            disabled={testing || !inputUrl.trim()}
          />
        </View>
      </Screen>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  current: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  currentLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  currentUrl: { fontSize: 13, color: colors.primary, marginTop: 4, fontWeight: '500' },
  field: { marginHorizontal: 16, marginTop: 8, gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 15,
    color: colors.text,
  },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  actions: { marginHorizontal: 16, marginTop: 20, gap: 10 },
  testBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  testBtnText: { color: colors.primary, fontWeight: '600' },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 12,
    marginBottom: 16,
  },
  compactLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  compactText: { flex: 1 },
  compactLabel: { fontSize: 12, fontWeight: '600', color: colors.primary },
  compactUrl: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
