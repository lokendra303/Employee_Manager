import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import { ErrorBanner, LoadingView, Screen } from '../components/ui';
import { colors } from '../theme';

export default function WorkersScreen({ navigation }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/workers')
      .then((res) => setWorkers(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingView label="Loading workers..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen title="Workers" subtitle="Tap a worker for profile">
        <ErrorBanner message={error} />
        <FlatList
          data={workers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate('WorkerProfile', { id: item.id })}
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                ₹{item.dailyRate}/day · {item.distributor?.name || '—'} · {item.status}
              </Text>
            </Pressable>
          )}
        />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 10 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
