import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import api from '../api/client';
import { ErrorBanner, LoadingView, Screen, StatCard } from '../components/ui';
import { colors } from '../theme';

export default function WorkerProfileScreen({ route }) {
  const { id } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const to = now.toISOString().slice(0, 10);

    api
      .get(`/workers/${id}/profile?from=${from}&to=${to}`)
      .then((res) => setProfile(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingView label="Loading profile..." />;
  if (error) return <ErrorBanner message={error} />;

  const worker = profile?.worker;

  return (
    <Screen title={worker?.name || 'Worker'} subtitle={worker?.distributor?.name}>
      <View style={styles.stats}>
        <StatCard label="Daily Rate" value={`₹${worker?.dailyRate ?? 0}`} />
        <StatCard
          label="Unpaid Balance"
          value={`₹${(worker?.unpaidBalance ?? 0).toLocaleString()}`}
        />
      </View>

      <Text style={styles.section}>This month</Text>
      <FlatList
        data={profile?.calendar?.filter((d) => d.status) || []}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No attendance this month</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.status}>{item.status}</Text>
            <Text style={styles.amount}>₹{item.accrualAmount ?? 0}</Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  section: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  date: { color: colors.text, fontWeight: '500' },
  status: { color: colors.textMuted },
  amount: { fontWeight: '600', color: colors.text },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 20 },
});
