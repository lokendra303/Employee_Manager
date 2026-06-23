import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ErrorBanner,
  LoadingView,
  PrimaryButton,
  Screen,
  StatCard,
  SuccessBanner,
} from '../components/ui';
import { colors } from '../theme';

const METHODS = ['CASH', 'UPI', 'BANK', 'OTHER'];

export default function PaySalaryScreen({ route }) {
  const title = route?.params?.title || 'Pay Salary';
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [distributorId, setDistributorId] = useState(null);
  const [accruals, setAccruals] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [walletBalance, setWalletBalance] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const workersUrl =
          user?.role === 'SUPERVISOR' && user?.linkedDistributorId
            ? '/workers?scope=distributor'
            : '/workers';
        const wRes = await api.get(workersUrl);
        setWorkers(wRes.data);

        if (user?.role === 'DISTRIBUTOR') {
          const dRes = await api.get('/distributors');
          if (dRes.data[0]) setDistributorId(dRes.data[0].id);
        } else if (user?.linkedDistributorId) {
          setDistributorId(user.linkedDistributorId);
        }

        if (user?.role === 'DISTRIBUTOR' || user?.role === 'SUPERVISOR') {
          const walletRes = await api.get('/wallet').catch(() => ({ data: { balance: 0 } }));
          setWalletBalance(walletRes.data.balance ?? 0);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const selectWorker = async (worker) => {
    setSelectedWorker(worker.id);
    setDistributorId(worker.distributorId);
    setAmount('');
    setMessage('');
    setError('');
    const res = await api.get(`/pay/accruals/${worker.id}`);
    setAccruals(res.data);
  };

  const payFull = () => setAmount(String(accruals?.balance ?? 0));

  const submitPayment = async () => {
    if (!distributorId || !selectedWorker) return;
    const payAmount = Number(amount);
    if (payAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      await api.post(`/distributors/${distributorId}/transactions`, {
        workerId: selectedWorker,
        amount: payAmount,
        paymentMethod: method,
        notes: notes.trim() || undefined,
      });
      setMessage(`Payment of ₹${payAmount.toLocaleString()} recorded`);
      const worker = workers.find((w) => w.id === selectedWorker);
      if (worker) selectWorker(worker);
      setAmount('');
      setNotes('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingView label="Loading workers..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView>
        <Screen title={title} subtitle="Record worker salary payments">
          <ErrorBanner message={error} />
          <SuccessBanner message={message} />

          {walletBalance != null ? (
            <View style={styles.wallet}>
              <StatCard label="Wallet Balance" value={`₹${walletBalance.toLocaleString()}`} />
            </View>
          ) : null}

          {!selectedWorker ? (
            <FlatList
              data={workers}
              scrollEnabled={false}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Pressable style={styles.workerRow} onPress={() => selectWorker(item)}>
                  <Text style={styles.workerName}>{item.name}</Text>
                  <Text style={styles.workerMeta}>₹{item.dailyRate}/day</Text>
                </Pressable>
              )}
            />
          ) : (
            <View style={styles.form}>
              <Pressable onPress={() => setSelectedWorker(null)}>
                <Text style={styles.back}>‹ All workers</Text>
              </Pressable>
              <StatCard
                label="Unpaid balance"
                value={`₹${(accruals?.balance ?? 0).toLocaleString()}`}
              />

              <Text style={styles.label}>Amount</Text>
              <View style={styles.amountRow}>
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0"
                />
                <Pressable style={styles.fullBtn} onPress={payFull}>
                  <Text style={styles.fullBtnText}>Full</Text>
                </Pressable>
              </View>

              <Text style={styles.label}>Payment method</Text>
              <View style={styles.methodRow}>
                {METHODS.map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setMethod(m)}
                    style={[styles.methodBtn, method === m && styles.methodActive]}
                  >
                    <Text style={[styles.methodText, method === m && styles.methodTextActive]}>
                      {m}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional"
              />

              <PrimaryButton
                title="Record Payment"
                onPress={submitPayment}
                loading={submitting}
              />
            </View>
          )}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  wallet: { paddingHorizontal: 16, marginBottom: 8 },
  list: { padding: 16 },
  workerRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  workerName: { fontWeight: '600', fontSize: 16, color: colors.text },
  workerMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  form: { padding: 16, gap: 10 },
  back: { color: colors.primary, fontWeight: '600', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  amountRow: { flexDirection: 'row', gap: 8 },
  amountInput: { flex: 1 },
  fullBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  fullBtnText: { fontWeight: '600', color: colors.primary },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  methodActive: { backgroundColor: colors.primary },
  methodText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  methodTextActive: { color: '#fff' },
});
