import { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import {
  ErrorBanner,
  LoadingView,
  PrimaryButton,
  Screen,
  StatCard,
  SuccessBanner,
} from '../components/ui';
import { colors } from '../theme';

const FILTERS = ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'];

export default function SystemAdminScreen() {
  const [stats, setStats] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [suspendOrg, setSuspendOrg] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setError('');
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
    try {
      await api.post(`/system/organizations/${id}/approve`);
      setMessage('Organization approved');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const reactivate = async (id) => {
    try {
      await api.post(`/system/organizations/${id}/reactivate`);
      setMessage('Organization reactivated');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitSuspend = async () => {
    if (!suspendOrg) return;
    setSuspending(true);
    setError('');
    try {
      await api.post(`/system/organizations/${suspendOrg.id}/suspend`, {
        reason: suspendReason.trim() || undefined,
      });
      setMessage('Organization suspended');
      setSuspendOrg(null);
      setSuspendReason('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSuspending(false);
    }
  };

  if (loading) return <LoadingView label="Loading..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen title="System Admin" subtitle="Approve, suspend, or reactivate organizations">
        <ErrorBanner message={error} />
        <SuccessBanner message={message} />

        <View style={styles.stats}>
          <StatCard label="Pending" value={String(stats?.pending ?? 0)} />
          <StatCard label="Approved" value={String(stats?.approved ?? 0)} />
          <StatCard label="Suspended" value={String(stats?.suspended ?? 0)} />
        </View>

        <View style={styles.filters}>
          {FILTERS.map((s) => (
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
          renderItem={({ item }) => {
            const admin = item.users?.[0];
            return (
              <View style={styles.card}>
                <Text style={styles.orgName}>{item.name}</Text>
                <Text style={styles.orgMeta}>{item.contactEmail || admin?.email || '—'}</Text>
                {admin ? (
                  <Text style={styles.orgMeta}>
                    Admin: {admin.name} ({admin.email})
                  </Text>
                ) : null}
                {item.rejectedReason && (item.status === 'REJECTED' || item.status === 'SUSPENDED') ? (
                  <Text style={styles.reason}>Reason: {item.rejectedReason}</Text>
                ) : null}
                {item.status === 'PENDING' ? (
                  <Pressable style={styles.approveBtn} onPress={() => approve(item.id)}>
                    <Text style={styles.approveText}>Approve</Text>
                  </Pressable>
                ) : null}
                {item.status === 'APPROVED' ? (
                  <Pressable style={styles.suspendBtn} onPress={() => setSuspendOrg(item)}>
                    <Text style={styles.suspendText}>Suspend</Text>
                  </Pressable>
                ) : null}
                {item.status === 'SUSPENDED' ? (
                  <Pressable style={styles.approveBtn} onPress={() => reactivate(item.id)}>
                    <Text style={styles.approveText}>Reactivate</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          }}
        />
      </Screen>

      <Modal visible={!!suspendOrg} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Suspend {suspendOrg?.name}?</Text>
            <Text style={styles.modalHint}>
              Users in this organization cannot sign in until you reactivate it.
            </Text>
            <Text style={styles.label}>Reason (optional)</Text>
            <TextInput
              style={styles.input}
              value={suspendReason}
              onChangeText={setSuspendReason}
              placeholder="e.g. Payment overdue"
              multiline
            />
            <PrimaryButton title="Suspend" onPress={submitSuspend} loading={suspending} />
            <Pressable
              style={styles.cancelBtn}
              onPress={() => {
                setSuspendOrg(null);
                setSuspendReason('');
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginBottom: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  filterActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  filterTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 24 },
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
  reason: { fontSize: 12, color: colors.danger, marginTop: 8 },
  approveBtn: {
    marginTop: 10,
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  approveText: { color: '#fff', fontWeight: '600' },
  suspendBtn: {
    marginTop: 10,
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  suspendText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 20 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalHint: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontWeight: '600', color: colors.textMuted },
});
