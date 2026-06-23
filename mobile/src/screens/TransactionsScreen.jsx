import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner, LoadingView, Screen } from '../components/ui';
import { colors } from '../theme';

const METHOD_LABELS = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK: 'Bank',
  OTHER: 'Other',
};

export default function TransactionsScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/reports/payment-transactions')
      .then((res) => setTransactions(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingView label="Loading transactions..." />;

  const subtitle =
    user?.role === 'SUPERVISOR'
      ? 'Payments for your assigned workers'
      : user?.role === 'ADMIN'
        ? 'All organization payments'
        : 'Your distributor payment ledger';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen title="Payments" subtitle={subtitle}>
        <ErrorBanner message={error} />
        <FlatList
          data={transactions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No transactions yet</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.name}>{item.worker?.name || 'Worker'}</Text>
                <Text style={styles.meta}>
                  {METHOD_LABELS[item.paymentMethod] || item.paymentMethod} ·{' '}
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.amount}>₹{(item.amount ?? 0).toLocaleString()}</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  rowLeft: { flex: 1 },
  name: { fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  amount: { fontWeight: '700', color: colors.text, fontSize: 16 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});
