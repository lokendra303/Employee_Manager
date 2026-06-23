import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import {
  ErrorBanner,
  LoadingView,
  Screen,
  StatCard,
  SuccessBanner,
} from '../components/ui';
import { colors } from '../theme';

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'P', color: colors.present },
  { value: 'HALF_DAY', label: '½', color: colors.halfDay },
  { value: 'ABSENT', label: 'A', color: colors.absent },
];

export default function AttendanceScreen({ navigation }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [grid, setGrid] = useState([]);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/attendance?date=${date}`);
      setGrid(res.data.grid);
      const initial = {};
      res.data.grid.forEach((row) => {
        if (row.attendance) initial[row.worker.id] = row.attendance.status;
      });
      setMarks(initial);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [date]);

  const shiftDate = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  };

  const setStatus = (workerId, status, editable) => {
    if (!editable) return;
    setMarks((prev) => ({ ...prev, [workerId]: status }));
  };

  const handleSave = async () => {
    const payload = grid
      .filter((row) => row.isEditable !== false && marks[row.worker.id])
      .map((row) => ({ workerId: row.worker.id, status: marks[row.worker.id] }));

    if (!payload.length) {
      setError('Mark at least one editable worker');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.post('/attendance/bulk', { date, records: payload });
      setMessage('Attendance saved');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingView label="Loading attendance..." />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen title="Attendance" subtitle="Mark daily worker attendance">
        <View style={styles.dateRow}>
          <Pressable onPress={() => shiftDate(-1)} style={styles.dateBtn}>
            <Text style={styles.dateBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.dateText}>{date}</Text>
          <Pressable onPress={() => shiftDate(1)} style={styles.dateBtn}>
            <Text style={styles.dateBtnText}>›</Text>
          </Pressable>
        </View>

        <ErrorBanner message={error} />
        <SuccessBanner message={message} />

        <FlatList
          data={grid}
          keyExtractor={(item) => String(item.worker.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No workers assigned for this date</Text>
          }
          renderItem={({ item }) => {
            const editable = item.isEditable !== false;
            const current = marks[item.worker.id];
            return (
              <Pressable
                style={styles.row}
                onPress={() => navigation.navigate('WorkerProfile', { id: item.worker.id })}
              >
                <View style={styles.rowInfo}>
                  <Text style={styles.workerName}>{item.worker.name}</Text>
                  <Text style={styles.workerMeta}>
                    ₹{item.worker.dailyRate}/day · {item.worker.distributor?.name || '—'}
                  </Text>
                  {!editable && item.lockReason ? (
                    <Text style={styles.locked}>{item.lockReason}</Text>
                  ) : null}
                </View>
                <View style={styles.statusRow}>
                  {STATUS_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => setStatus(item.worker.id, opt.value, editable)}
                      style={[
                        styles.statusBtn,
                        current === opt.value && { backgroundColor: opt.color },
                        !editable && styles.statusDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusLabel,
                          current === opt.value && styles.statusLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Pressable>
            );
          }}
        />

        <View style={styles.footer}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, saving && styles.saveDisabled]}
          >
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Attendance'}</Text>
          </Pressable>
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  dateBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBtnText: { fontSize: 20, color: colors.text },
  dateText: { fontSize: 16, fontWeight: '600', color: colors.text },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  rowInfo: { marginBottom: 10 },
  workerName: { fontSize: 16, fontWeight: '600', color: colors.text },
  workerMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  locked: { fontSize: 11, color: colors.warning, marginTop: 4 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  statusDisabled: { opacity: 0.5 },
  statusLabel: { fontWeight: '600', color: colors.textMuted },
  statusLabelActive: { color: '#fff' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
