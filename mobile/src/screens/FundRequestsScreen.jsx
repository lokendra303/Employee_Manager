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
  Badge,
  ErrorBanner,
  LoadingView,
  PrimaryButton,
  Screen,
  StatCard,
  SuccessBanner,
} from '../components/ui';
import { colors } from '../theme';

const STATUS_TONES = {
  PENDING: 'warning',
  APPROVED: 'brand',
  FUND_SENT: 'brand',
  RECEIVED: 'success',
  REJECTED: 'danger',
  DISPUTED: 'warning',
};

export default function FundRequestsScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [calculation, setCalculation] = useState(null);
  const [requests, setRequests] = useState([]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      if (isAdmin) {
        const reqRes = await api.get('/fund-requests');
        setRequests(reqRes.data);
      } else {
        const [calcRes, reqRes] = await Promise.all([
          api.get('/fund-requests/calculate'),
          api.get('/fund-requests'),
        ]);
        setCalculation(calcRes.data);
        setRequests(reqRes.data);
        setAmount(String(calcRes.data.fundNeeded || ''));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [isAdmin]);

  const submitRequest = async () => {
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      await api.post('/fund-requests', {
        requestedAmount: Number(amount),
        notes: notes || undefined,
      });
      setMessage('Fund request submitted');
      setNotes('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const acceptRequest = async (id) => {
    try {
      await api.post(`/fund-requests/${id}/accept`);
      setMessage('Funds accepted');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const approveRequest = async (id, approvedAmount) => {
    try {
      await api.post(`/fund-requests/${id}/approve`, { approvedAmount });
      setMessage('Request approved');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <LoadingView label="Loading fund requests..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView>
        <Screen
          title="Fund Requests"
          subtitle={isAdmin ? 'Review and approve requests' : 'Request organization funds'}
        >
          <ErrorBanner message={error} />
          <SuccessBanner message={message} />

          {!isAdmin && calculation ? (
            <View style={styles.stats}>
              <StatCard
                label="Fund Needed"
                value={`₹${(calculation.fundNeeded ?? 0).toLocaleString()}`}
              />
              <StatCard
                label="Workers"
                value={String(calculation.workerCount ?? 0)}
              />
            </View>
          ) : null}

          {!isAdmin ? (
            <View style={styles.form}>
              <Text style={styles.label}>Requested amount</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
              />
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes"
              />
              <PrimaryButton
                title="Submit Request"
                onPress={submitRequest}
                loading={submitting}
              />
            </View>
          ) : null}

          <Text style={styles.section}>Requests</Text>
          {requests.map((req) => (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  ₹{(req.requestedAmount ?? 0).toLocaleString()}
                </Text>
                <Badge label={req.status} tone={STATUS_TONES[req.status] || 'neutral'} />
              </View>
              <Text style={styles.cardMeta}>
                {req.requester?.name || req.requesterType} ·{' '}
                {new Date(req.createdAt).toLocaleDateString()}
              </Text>
              {req.status === 'FUND_SENT' && !isAdmin ? (
                <Pressable style={styles.actionBtn} onPress={() => acceptRequest(req.id)}>
                  <Text style={styles.actionText}>Accept Funds</Text>
                </Pressable>
              ) : null}
              {isAdmin && req.status === 'PENDING' ? (
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => approveRequest(req.id, req.requestedAmount)}
                >
                  <Text style={styles.actionText}>Approve</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          {!requests.length ? (
            <Text style={styles.empty}>No fund requests yet</Text>
          ) : null}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  form: { padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  section: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  actionBtn: {
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, padding: 24 },
});
