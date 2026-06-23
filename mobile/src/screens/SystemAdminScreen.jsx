import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import { ErrorBanner, LoadingView, Screen, StatCard, SuccessBanner } from '../components/ui';
import { colors } from '../theme';

export default function SystemAdminScreen() {
  const [stats, setStats] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, orgsRes] = await Promise.all([
        api.get('/system/stats'),
        api.get(`/system/organizations?status=${filter}`),
      ]);
      setStats(statsRes.data);
      setOrganizations(orgsRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const approve = async (id) => {
    await api.post(`/system/organizations/${id}/approve`);
    setMessage('Organization approved');
    load();
  };

  if (loading) return <LoadingView label="Loading..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen title="System Admin" subtitle="Manage organization registrations">
        <ErrorBanner message={error} />
        <SuccessBanner message={message} />

        <View style={styles.stats}>
          <StatCard label="Pending" value={String(stats?.pending ?? 0)} />
          <StatCard label="Approved" value={String(stats?.approved ?? 0)} />
        </View>

        <View style={styles.filters}>
          {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
            <Pressable
              key={s}
              onPress={() => setFilter(s)}
              style={[styles.filterBtn, filter === s && styles.filterActive]}
            >
              <Text style={[styles.filterText, filter === s && styles.filterTextActive]}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={organizations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No organizations</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.orgName}>{item.name}</Text>
              <Text style={styles.orgMeta}>{item.adminEmail}</Text>
              {filter === 'PENDING' ? (
                <Pressable style={styles.approveBtn} onPress={() => approve(item.id)}>
                  <Text style={styles.approveText}>Approve</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  stats: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 12 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  filterActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  filterTextActive: { color: '#fff' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  orgName: { fontWeight: '600', fontSize: 16, color: colors.text },
  orgMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  approveBtn: {
    marginTop: 10,
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  approveText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 20 },
});
