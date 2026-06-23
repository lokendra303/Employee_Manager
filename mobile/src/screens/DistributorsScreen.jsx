import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import api from '../api/client';
import { ErrorBanner, LoadingView, Screen } from '../components/ui';
import { colors } from '../theme';

export default function DistributorsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/distributors')
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingView label="Loading distributors..." />;

  return (
    <Screen title="Distributors">
      <ErrorBanner message={error} />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.phone || '—'} · {item.status}</Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  name: { fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
