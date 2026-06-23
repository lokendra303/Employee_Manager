import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import { ErrorBanner, LoadingView, Screen } from '../components/ui';
import { colors } from '../theme';

export default function ReportsScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/reports/days-worked')
      .then((res) => setRows(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingView label="Loading reports..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen title="Reports" subtitle="Days worked by worker">
        <ErrorBanner message={error} />
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.workerId)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No data yet</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.name}>{item.workerName}</Text>
              <Text style={styles.days}>{item.daysWorked} days</Text>
              <Text style={styles.amount}>₹{(item.totalEarned ?? 0).toLocaleString()}</Text>
            </View>
          )}
        />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: { flex: 1, fontWeight: '600', color: colors.text },
  days: { color: colors.textMuted, fontSize: 13 },
  amount: { fontWeight: '700', color: colors.text },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});
