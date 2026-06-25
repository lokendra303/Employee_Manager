import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import { ErrorBanner, LoadingView, Screen, StatCard } from '../components/ui';
import { colors } from '../theme';

export default function WalletScreen({ navigation }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/wallet')
      .then((res) => setWallet(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingView label="Loading wallet..." />;

  const balance = wallet?.balance ?? 0;
  const advanceDue = wallet?.personalAdvanceDue ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen title="My Wallet" subtitle="Funds and disbursements">
        <ErrorBanner message={error} />
        <View style={styles.stats}>
          <StatCard
            label="Available Balance"
            value={`₹${balance.toLocaleString()}`}
            sub={balance < 0 ? 'Overdrawn' : 'Ready to pay workers'}
          />
          <StatCard
            label="Personal Advance Due"
            value={`₹${advanceDue.toLocaleString()}`}
            sub="Claim via Fund Request"
          />
        </View>

        <Text style={styles.section}>Recent transactions</Text>
        <FlatList
          data={wallet?.transactions || []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No transactions yet</Text>}
          renderItem={({ item }) => {
            const isCredit = item.type === 'CREDIT';
            return (
              <View style={styles.row}>
                <View>
                  <Text style={styles.rowTitle}>
                    {item.type === 'CREDIT' ? 'Fund received' : 'Worker payment'}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {item.worker?.name || item.notes || '—'}
                  </Text>
                </View>
                <Text style={[styles.amount, isCredit ? styles.credit : styles.debit]}>
                  {isCredit ? '+' : '-'}₹{Math.abs(item.amount).toLocaleString()}
                </Text>
              </View>
            );
          }}
        />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  rowTitle: { fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  amount: { fontWeight: '700', fontSize: 16 },
  credit: { color: colors.success },
  debit: { color: colors.danger },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 20 },
});
