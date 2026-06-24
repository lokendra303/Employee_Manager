import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import api from '../api/client';
import PageShell from '../components/PageShell';
import {
  Badge,
  ErrorBanner,
  LoadingView,
  PrimaryButton,
  SuccessBanner,
} from '../components/ui';
import { colors } from '../theme';

const emptyForm = {
  name: '',
  contactPhone: '',
  contactEmail: '',
  openingBalance: '0',
  userId: '',
};

const emptyEditForm = { name: '', contactPhone: '', contactEmail: '' };

function formatMoney(value) {
  return `₹${(Number(value) || 0).toLocaleString()}`;
}

export default function DistributorsScreen() {
  const [items, setItems] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showSupervisorPicker, setShowSupervisorPicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const [dRes, sRes] = await Promise.all([
        api.get('/distributors'),
        api.get('/reports/supervisors').catch(() => ({ data: [] })),
      ]);
      setItems(Array.isArray(dRes.data) ? dRes.data : []);
      setSupervisors(Array.isArray(sRes.data) ? sRes.data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedSupervisor = supervisors.find((s) => String(s.id) === String(form.userId));

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setCreating(true);
    setError('');
    setMessage('');
    try {
      await api.post('/distributors', {
        name: form.name.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        openingBalance: Number(form.openingBalance) || 0,
        userId: form.userId ? Number(form.userId) : undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      setShowSupervisorPicker(false);
      setMessage('Distributor created');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (d) => {
    setEditingId(d.id);
    setEditForm({
      name: d.name || '',
      contactPhone: d.contactPhone || '',
      contactEmail: d.contactEmail || '',
    });
    setError('');
    setMessage('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name.trim()) {
      setError('Name is required');
      return;
    }
    setSavingEdit(true);
    setError('');
    try {
      await api.put(`/distributors/${editingId}`, {
        name: editForm.name.trim(),
        contactPhone: editForm.contactPhone.trim() || undefined,
        contactEmail: editForm.contactEmail.trim() || '',
      });
      setMessage('Distributor updated');
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) return <LoadingView label="Loading distributors..." />;

  return (
    <PageShell
      title="Distributors"
      subtitle="Manage field distributors and track worker payments"
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <ErrorBanner message={error} />
        <SuccessBanner message={message} />

        <Pressable
          style={styles.addToggle}
          onPress={() => {
            setShowForm((v) => !v);
            setShowSupervisorPicker(false);
          }}
        >
          <Text style={styles.addToggleText}>{showForm ? 'Cancel' : '+ Add Distributor'}</Text>
        </Pressable>

        {showForm ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>New Distributor</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(name) => setForm({ ...form, name })}
              placeholder="Distributor name"
            />
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={form.contactPhone}
              onChangeText={(contactPhone) => setForm({ ...form, contactPhone })}
              placeholder="Contact phone"
              keyboardType="phone-pad"
            />
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.contactEmail}
              onChangeText={(contactEmail) => setForm({ ...form, contactEmail })}
              placeholder="Contact email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.label}>Opening Balance (₹)</Text>
            <TextInput
              style={styles.input}
              value={form.openingBalance}
              onChangeText={(openingBalance) => setForm({ ...form, openingBalance })}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Link login user (optional)</Text>
            <Pressable
              style={styles.selectBtn}
              onPress={() => setShowSupervisorPicker((v) => !v)}
            >
              <Text style={styles.selectBtnText}>
                {selectedSupervisor
                  ? `${selectedSupervisor.name} (${selectedSupervisor.email})`
                  : '— None —'}
              </Text>
            </Pressable>
            {showSupervisorPicker ? (
              <View style={styles.pickerList}>
                <Pressable
                  style={styles.pickerItem}
                  onPress={() => {
                    setForm({ ...form, userId: '' });
                    setShowSupervisorPicker(false);
                  }}
                >
                  <Text>— None —</Text>
                </Pressable>
                {supervisors.map((s) => (
                  <Pressable
                    key={s.id}
                    style={styles.pickerItem}
                    onPress={() => {
                      setForm({ ...form, userId: String(s.id) });
                      setShowSupervisorPicker(false);
                    }}
                  >
                    <Text>
                      {s.name} ({s.email})
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <PrimaryButton title="Create Distributor" onPress={handleCreate} loading={creating} />
          </View>
        ) : null}

        {!items.length ? (
          <Text style={styles.empty}>No distributors yet</Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleBlock}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.contactPhone ? (
                    <Text style={styles.phone}>{item.contactPhone}</Text>
                  ) : (
                    <Text style={styles.phoneMuted}>No phone</Text>
                  )}
                  {item.contactEmail ? (
                    <Text style={styles.email}>{item.contactEmail}</Text>
                  ) : null}
                </View>
                <Badge label={`${item.workerCount ?? 0} workers`} tone="brand" />
              </View>

              {item.linkedUser ? (
                <View style={styles.linkedRow}>
                  <Badge
                    label={
                      item.linkedUser.isSupervisorDistributor
                        ? 'Supervisor + Distributor'
                        : item.linkedUser.role
                    }
                    tone={item.linkedUser.isSupervisorDistributor ? 'warning' : 'brand'}
                  />
                  <Text style={styles.linkedName}>{item.linkedUser.name}</Text>
                </View>
              ) : (
                <Text style={styles.noLink}>No login linked</Text>
              )}

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Paid</Text>
                  <Text style={[styles.statValue, styles.paid]}>{formatMoney(item.totalPaid)}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Pending</Text>
                  <Text style={[styles.statValue, styles.pending]}>
                    {formatMoney(item.totalPending)}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Opening</Text>
                  <Text style={styles.statValue}>{formatMoney(item.openingBalance)}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.meta}>
                  Balance {formatMoney(item.balance)} ·{' '}
                  {item.isActive === false ? 'Inactive' : 'Active'}
                </Text>
              </View>

              <Pressable style={styles.editBtn} onPress={() => openEdit(item)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!editingId} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.formTitle}>Edit Distributor</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={editForm.name}
              onChangeText={(name) => setEditForm({ ...editForm, name })}
            />
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={editForm.contactPhone}
              onChangeText={(contactPhone) => setEditForm({ ...editForm, contactPhone })}
              keyboardType="phone-pad"
            />
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={editForm.contactEmail}
              onChangeText={(contactEmail) => setEditForm({ ...editForm, contactEmail })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditingId(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <View style={styles.saveBtnWrap}>
                <PrimaryButton title="Save" onPress={handleSaveEdit} loading={savingEdit} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  addToggle: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  addToggleText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  selectBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.background,
  },
  selectBtnText: { fontSize: 15, color: colors.text },
  pickerList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  pickerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitleBlock: { flex: 1 },
  name: { fontWeight: '700', fontSize: 17, color: colors.text },
  phone: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  phoneMuted: { fontSize: 13, color: colors.warning, marginTop: 4 },
  email: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  linkedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  linkedName: { fontSize: 12, color: colors.textMuted },
  noLink: { fontSize: 12, color: colors.warning, marginTop: 10 },
  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  stat: { flex: 1 },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
  paid: { color: colors.success },
  pending: { color: colors.warning },
  metaRow: { marginTop: 10 },
  meta: { fontSize: 12, color: colors.textMuted },
  editBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editBtnText: { fontWeight: '600', color: colors.text },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
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
    gap: 8,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontWeight: '600', color: colors.text },
  saveBtnWrap: { flex: 1 },
});
