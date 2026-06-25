import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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

const emptyForm = { name: '', email: '', password: '' };

export default function SupervisorsScreen() {
  const [supervisors, setSupervisors] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    password: '',
    isActive: true,
  });
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const [sRes, wRes] = await Promise.all([
        api.get('/reports/supervisors'),
        api.get('/workers'),
      ]);
      const list = Array.isArray(sRes.data) ? sRes.data : [];
      setSupervisors(list);
      setWorkers(Array.isArray(wRes.data) ? wRes.data : []);
      return list;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (sup) => {
    setEditingSupervisor(sup);
    setProfileForm({
      name: sup.name || '',
      email: sup.email || '',
      password: '',
      isActive: sup.isActive ?? true,
    });
    setSelectedWorkers(sup.supervisorAssignments?.map((a) => a.workerId) || []);
    setError('');
    setMessage('');
  };

  const closeEdit = () => {
    setEditingSupervisor(null);
    setProfileForm({ name: '', email: '', password: '', isActive: true });
    setSelectedWorkers([]);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Name, email, and password are required');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/reports/users', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: 'SUPERVISOR',
      });
      setForm(emptyForm);
      setShowForm(false);
      setMessage(`Supervisor "${res.data.name}" created`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editingSupervisor) return;
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setError('Name and email are required');
      return;
    }
    if (profileForm.password && profileForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSavingProfile(true);
    setError('');
    try {
      const payload = {
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        isActive: profileForm.isActive,
      };
      if (profileForm.password.trim()) {
        payload.password = profileForm.password.trim();
      }
      await api.put(`/reports/supervisors/${editingSupervisor.id}`, payload);
      setMessage('Supervisor profile updated');
      closeEdit();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleWorker = (workerId) => {
    setSelectedWorkers((prev) =>
      prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!editingSupervisor) return;
    setSavingAssignments(true);
    setError('');
    try {
      await api.post('/reports/supervisors/assign', {
        supervisorId: editingSupervisor.id,
        workerIds: selectedWorkers,
      });
      setMessage('Worker assignments saved');
      closeEdit();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAssignments(false);
    }
  };

  if (loading) return <LoadingView label="Loading supervisors..." />;

  return (
    <PageShell
      title="Supervisors"
      subtitle="Create supervisors, edit profiles, and assign workers"
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <ErrorBanner message={error} />
        <SuccessBanner message={message} />

        <Pressable
          style={styles.addToggle}
          onPress={() => {
            setShowForm((v) => !v);
            setError('');
          }}
        >
          <Text style={styles.addToggleText}>{showForm ? 'Cancel' : '+ Add Supervisor'}</Text>
        </Pressable>

        {showForm ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>New Supervisor</Text>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(name) => setForm({ ...form, name })}
              placeholder="e.g. Rajesh Sharma"
            />
            <Text style={styles.label}>Email (login)</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(email) => setForm({ ...form, email })}
              placeholder="supervisor@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={form.password}
              onChangeText={(password) => setForm({ ...form, password })}
              placeholder="Min 6 characters"
              secureTextEntry
            />
            <PrimaryButton title="Create Supervisor" onPress={handleCreate} loading={creating} />
          </View>
        ) : null}

        {!supervisors.length ? (
          <Text style={styles.empty}>No supervisors yet</Text>
        ) : (
          supervisors.map((sup) => {
            const workerCount = sup.supervisorAssignments?.length ?? 0;
            const assignedNames = (sup.supervisorAssignments || [])
              .map((a) => a.worker?.name)
              .filter(Boolean)
              .slice(0, 3)
              .join(', ');

            return (
              <Pressable key={sup.id} style={styles.card} onPress={() => openEdit(sup)}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleBlock}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{sup.name}</Text>
                      {!sup.isActive ? <Badge label="Inactive" tone="danger" /> : null}
                      {sup.distributorProfile ? (
                        <Badge label="Also Distributor" tone="warning" />
                      ) : null}
                    </View>
                    <Text style={styles.email}>{sup.email || 'No email'}</Text>
                    {sup.distributorProfile ? (
                      <Text style={styles.distributorLink}>
                        Distributor: {sup.distributorProfile.name}
                      </Text>
                    ) : null}
                  </View>
                  <Badge label={`${workerCount} workers`} tone="brand" />
                </View>
                {assignedNames ? (
                  <Text style={styles.assigned}>Assigned: {assignedNames}</Text>
                ) : (
                  <Text style={styles.noAssigned}>No workers assigned</Text>
                )}
                <Text style={styles.tapHint}>Tap to edit profile or assign workers</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={!!editingSupervisor}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeEdit} />
          <ScrollView
            style={styles.modalCardWrap}
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard}>
              <Text style={styles.formTitle}>Edit Supervisor</Text>
              {editingSupervisor?.distributorProfile ? (
                <View style={styles.distributorBanner}>
                  <Text style={styles.distributorBannerText}>
                    Linked as distributor: {editingSupervisor.distributorProfile.name}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={profileForm.name}
                onChangeText={(name) => setProfileForm({ ...profileForm, name })}
              />
              <Text style={styles.label}>Email (login)</Text>
              <TextInput
                style={styles.input}
                value={profileForm.email}
                onChangeText={(email) => setProfileForm({ ...profileForm, email })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.label}>New Password (optional)</Text>
              <TextInput
                style={styles.input}
                value={profileForm.password}
                onChangeText={(password) => setProfileForm({ ...profileForm, password })}
                placeholder="Min 6 characters if changing"
                secureTextEntry
              />
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.switchLabel}>Account active</Text>
                  <Text style={styles.switchHint}>Inactive supervisors cannot sign in</Text>
                </View>
                <Switch
                  value={profileForm.isActive}
                  onValueChange={(isActive) => setProfileForm({ ...profileForm, isActive })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>
              <PrimaryButton
                title="Save Profile"
                onPress={handleSaveProfile}
                loading={savingProfile}
              />

              <Text style={styles.sectionTitle}>Assign Workers</Text>
              <Text style={styles.sectionHint}>
                {editingSupervisor?.name} can mark attendance and pay salary for checked workers
                only.
              </Text>
              {workers.map((w) => {
                const checked = selectedWorkers.includes(w.id);
                return (
                  <Pressable
                    key={w.id}
                    style={[styles.workerRow, checked && styles.workerRowChecked]}
                    onPress={() => toggleWorker(w.id)}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerName}>{w.name}</Text>
                      <Text style={styles.workerMeta}>
                        ₹{Number(w.dailyRate || 0).toLocaleString()}/day ·{' '}
                        {w.distributor?.name || '—'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              {!workers.length ? (
                <Text style={styles.emptyWorkers}>No workers in organization</Text>
              ) : null}
              <PrimaryButton
                title="Save Worker Assignments"
                onPress={handleSaveAssignments}
                loading={savingAssignments}
              />

              <Pressable style={styles.cancelBtn} onPress={closeEdit}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </Pressable>
            </View>
          </ScrollView>
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
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  name: { fontWeight: '700', fontSize: 17, color: colors.text },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  distributorLink: { fontSize: 12, color: colors.warning, marginTop: 4 },
  assigned: { fontSize: 12, color: colors.textMuted, marginTop: 10 },
  noAssigned: { fontSize: 12, color: colors.warning, marginTop: 10 },
  tapHint: { fontSize: 11, color: colors.primary, marginTop: 8, fontWeight: '500' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCardWrap: {
    maxHeight: '92%',
    marginTop: 'auto',
  },
  modalScroll: { flexGrow: 1 },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 8,
    maxHeight: '92%',
  },
  distributorBanner: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  distributorBannerText: { fontSize: 13, color: '#92400e' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  switchText: { flex: 1, paddingRight: 12 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  switchHint: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 4,
  },
  sectionHint: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: 8,
  },
  workerRowChecked: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  workerInfo: { flex: 1 },
  workerName: { fontWeight: '600', color: colors.text },
  workerMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  emptyWorkers: { textAlign: 'center', color: colors.textMuted, paddingVertical: 12 },
  cancelBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { fontWeight: '600', color: colors.text },
});
