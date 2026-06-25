import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../api/client';
import ScreenLayout from '../components/ScreenLayout';
import { Badge, Card, ErrorBanner, InputField, LoadingView, PrimaryButton, StatCard, SuccessBanner } from '../components/ui';
import { colors, radius, shadow, spacing } from '../theme';

function formatMoney(value) {
  return `₹${(Number(value) || 0).toLocaleString()}`;
}

function WorkerAvatar({ name }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <LinearGradient colors={['#0d9488', '#14b8a6']} style={styles.avatar}>
      <Text style={styles.avatarText}>{initial}</Text>
    </LinearGradient>
  );
}

function AttendanceStrip({ monthAttendance }) {
  const present = monthAttendance?.present || 0;
  const halfDay = monthAttendance?.halfDay || 0;
  const absent = monthAttendance?.absent || 0;
  const total = present + halfDay + absent;

  if (!total) {
    return <Text style={styles.attEmpty}>No attendance this month</Text>;
  }

  return (
    <View style={styles.attWrap}>
      <View style={styles.attBar}>
        {present > 0 ? <View style={[styles.attSeg, { flex: present, backgroundColor: colors.present }]} /> : null}
        {halfDay > 0 ? <View style={[styles.attSeg, { flex: halfDay, backgroundColor: colors.halfDay }]} /> : null}
        {absent > 0 ? <View style={[styles.attSeg, { flex: absent, backgroundColor: colors.absent }]} /> : null}
      </View>
      <Text style={styles.attMeta}>
        {present}P · {halfDay}½ · {absent}A
      </Text>
    </View>
  );
}

function WorkerListCard({ worker, onPress }) {
  const total = (worker.totalPaid || 0) + (worker.unpaidBalance || 0);
  const pct = total > 0 ? Math.round((worker.totalPaid / total) * 100) : 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.cardPressed]}>
      <Card style={styles.card} elevated>
        <View style={styles.cardTopLine} />
        <View style={styles.cardHeader}>
          <WorkerAvatar name={worker.name} />
          <View style={styles.cardHeaderText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{worker.name}</Text>
              <Badge label={worker.status} tone={worker.status === 'ACTIVE' ? 'success' : 'neutral'} />
            </View>
            <Text style={styles.distributor} numberOfLines={1}>
              {worker.distributor?.name || '—'} · ₹{worker.dailyRate}/day
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>

        <View style={styles.moneyRow}>
          <View style={[styles.moneyBox, styles.moneyPaid]}>
            <Text style={styles.moneyLabel}>Paid</Text>
            <Text style={styles.moneyPaidValue}>{formatMoney(worker.totalPaid)}</Text>
          </View>
          <View style={[styles.moneyBox, styles.moneyDue]}>
            <Text style={styles.moneyLabel}>Due</Text>
            <Text style={styles.moneyDueValue}>{formatMoney(worker.unpaidBalance)}</Text>
          </View>
        </View>

        {total > 0 ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressHead}>
              <Text style={styles.progressLabel}>Salary settled</Text>
              <Text style={styles.progressPct}>{pct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
          </View>
        ) : null}

        <AttendanceStrip monthAttendance={worker.monthAttendance} />
      </Card>
    </Pressable>
  );
}

export default function WorkersScreen({ navigation }) {
  const [workers, setWorkers] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    dailyRate: '',
    payoutIntervalDays: '7',
    payCycleAnchor: new Date().toISOString().slice(0, 10),
    distributorId: '',
  });

  const load = async () => {
    try {
      const [wRes, dRes] = await Promise.all([
        api.get('/workers'),
        api.get('/distributors'),
      ]);
      setWorkers(wRes.data);
      setDistributors(dRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workers;
    return workers.filter(
      (w) =>
        w.name?.toLowerCase().includes(q) ||
        w.distributor?.name?.toLowerCase().includes(q) ||
        w.phone?.includes(q)
    );
  }, [workers, search]);

  const totals = useMemo(
    () =>
      workers.reduce(
        (acc, w) => ({
          active: acc.active + (w.status === 'ACTIVE' ? 1 : 0),
          unpaid: acc.unpaid + (w.unpaidBalance || 0),
          paid: acc.paid + (w.totalPaid || 0),
        }),
        { active: 0, unpaid: 0, paid: 0 }
      ),
    [workers]
  );

  const selectedProject = distributors.find((d) => String(d.id) === String(form.distributorId));

  const submitWorker = async () => {
    if (!form.name.trim() || !form.dailyRate || !form.distributorId) {
      setError('Name, daily rate, and project are required');
      return;
    }
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      await api.post('/workers', {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        dailyRate: Number(form.dailyRate),
        payoutIntervalDays: Number(form.payoutIntervalDays),
        payCycleAnchor: form.payCycleAnchor,
        distributorId: Number(form.distributorId),
      });
      setMessage('Worker created');
      setShowAdd(false);
      setForm({
        name: '',
        phone: '',
        dailyRate: '',
        payoutIntervalDays: '7',
        payCycleAnchor: new Date().toISOString().slice(0, 10),
        distributorId: '',
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingView label="Loading workers..." />;

  return (
    <>
    <ScreenLayout
      title="Workers"
      subtitle="Tap a worker for full attendance & payment history"
      headerDark
      showNotifications
      onNotificationsPress={() => navigation.navigate('Notifications')}
      edges={[]}
    >
      <ErrorBanner message={error} />
      <SuccessBanner message={message} />

      <View style={styles.actions}>
        <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="person-add-outline" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add Worker</Text>
        </Pressable>
        <Pressable
          style={styles.projectBtn}
          onPress={() => navigation.getParent()?.navigate('AdminDistributors')}
        >
          <Ionicons name="business-outline" size={18} color={colors.primary} />
          <Text style={styles.projectBtnText}>Add Project</Text>
        </Pressable>
      </View>

      {distributors.length === 0 && (
        <Text style={styles.hint}>
          Create a project / site first (Add Project), then add workers to it.
        </Text>
      )}

      <View style={styles.stats}>
        <StatCard label="Active" value={String(totals.active)} icon="people-outline" tone="brand" />
        <StatCard label="Total Paid" value={formatMoney(totals.paid)} icon="checkmark-circle-outline" tone="success" />
        <StatCard label="Unpaid" value={formatMoney(totals.unpaid)} icon="alert-circle-outline" tone="warning" />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search workers..."
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.empty}>No workers found</Text>
      ) : (
        <View style={styles.list}>
          {filtered.map((item) => (
            <WorkerListCard
              key={item.id}
              worker={item}
              onPress={() => navigation.navigate('WorkerProfile', { id: item.id })}
            />
          ))}
        </View>
      )}
    </ScreenLayout>

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAdd(false)} />
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add Worker</Text>
              <InputField label="Name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
              <InputField label="Phone" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} keyboardType="phone-pad" />
              <InputField label="Daily rate (₹)" value={form.dailyRate} onChangeText={(dailyRate) => setForm({ ...form, dailyRate })} keyboardType="numeric" />
              <Text style={styles.fieldLabel}>Pay every (days)</Text>
              <View style={styles.payRow}>
                {['2', '7', '14', '30'].map((d) => (
                  <Pressable
                    key={d}
                    style={[styles.payChip, form.payoutIntervalDays === d && styles.payChipActive]}
                    onPress={() => setForm({ ...form, payoutIntervalDays: d })}
                  >
                    <Text style={[styles.payChipText, form.payoutIntervalDays === d && styles.payChipTextActive]}>{d}d</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Project / Site</Text>
              <Pressable style={styles.selectBtn} onPress={() => setShowProjectPicker((v) => !v)}>
                <Text style={styles.selectBtnText}>{selectedProject?.name || 'Select project / site'}</Text>
              </Pressable>
              {showProjectPicker ? (
                <View style={styles.pickerList}>
                  {distributors.map((d) => (
                    <Pressable
                      key={d.id}
                      style={styles.pickerItem}
                      onPress={() => {
                        setForm({ ...form, distributorId: String(d.id) });
                        setShowProjectPicker(false);
                      }}
                    >
                      <Text>{d.name}</Text>
                    </Pressable>
                  ))}
                  {!distributors.length ? (
                    <Text style={styles.pickerEmpty}>No projects — tap Add Project first</Text>
                  ) : null}
                </View>
              ) : null}
              <PrimaryButton title="Create Worker" onPress={submitWorker} loading={submitting} />
              <Pressable style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadow('sm'),
  },
  searchIcon: { marginLeft: spacing.md },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    fontSize: 15,
    color: colors.text,
  },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  card: { overflow: 'hidden', gap: spacing.md },
  cardPressed: { opacity: 0.92 },
  cardTopLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 4 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  cardHeaderText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 17, fontWeight: '800', color: colors.text, flexShrink: 1 },
  distributor: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  moneyRow: { flexDirection: 'row', gap: spacing.sm },
  moneyBox: { flex: 1, borderRadius: radius.md, padding: spacing.sm },
  moneyPaid: { backgroundColor: colors.successSoft },
  moneyDue: { backgroundColor: colors.warningSoft },
  moneyLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: colors.textMuted },
  moneyPaidValue: { fontSize: 16, fontWeight: '800', color: colors.success, marginTop: 2 },
  moneyDueValue: { fontSize: 16, fontWeight: '800', color: colors.warning, marginTop: 2 },
  progressWrap: { gap: 6 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  progressPct: { fontSize: 11, fontWeight: '800', color: colors.success },
  progressTrack: { height: 6, borderRadius: 99, backgroundColor: colors.borderLight, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.success, borderRadius: 99 },
  attWrap: { gap: 6 },
  attBar: { flexDirection: 'row', height: 6, borderRadius: 99, overflow: 'hidden', backgroundColor: colors.borderLight },
  attSeg: { height: '100%' },
  attMeta: { fontSize: 11, color: colors.textMuted },
  attEmpty: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 32 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  projectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  projectBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  hint: { fontSize: 13, color: colors.warning, marginBottom: spacing.md, lineHeight: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 4 },
  payRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  payChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.borderLight,
  },
  payChipActive: { backgroundColor: colors.primary },
  payChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  payChipTextActive: { color: '#fff' },
  selectBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colors.background,
  },
  selectBtnText: { fontSize: 15, color: colors.text },
  pickerList: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', marginBottom: 8 },
  pickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#fff' },
  pickerEmpty: { padding: 12, color: colors.textMuted, fontSize: 13 },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { fontWeight: '600', color: colors.textMuted },
});
