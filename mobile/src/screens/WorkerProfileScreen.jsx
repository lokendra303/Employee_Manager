import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../api/client';
import { Badge, Card, ErrorBanner, LoadingView, StatCard } from '../components/ui';
import { colors, radius, shadow, spacing } from '../theme';

const STATUS_COLORS = {
  PRESENT: colors.present,
  HALF_DAY: colors.halfDay,
  ABSENT: colors.absent,
};

const STATUS_LABELS = {
  PRESENT: 'Present',
  HALF_DAY: 'Half day',
  ABSENT: 'Absent',
};

const METHOD_LABELS = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK: 'Bank',
  OTHER: 'Other',
};

function formatMoney(value) {
  return `₹${(Number(value) || 0).toLocaleString()}`;
}

function monthBounds(year, month) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function WorkerHero({ worker }) {
  const initial = (worker?.name || '?').charAt(0).toUpperCase();
  return (
    <LinearGradient colors={['#0f766e', '#0d9488', '#115e59']} style={styles.hero}>
      <View style={styles.heroGlow} />
      <View style={styles.heroRow}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>{initial}</Text>
        </View>
        <View style={styles.heroText}>
          <View style={styles.heroNameRow}>
            <Text style={styles.heroName}>{worker.name}</Text>
            <Badge label={worker.status} tone={worker.status === 'ACTIVE' ? 'success' : 'neutral'} />
          </View>
          <Text style={styles.heroSub}>
            {formatMoney(worker.dailyRate)}/day · {worker.distributor?.name || '—'}
          </Text>
          <Text style={styles.heroPeriod}>
            Pay every {worker.payoutIntervalDays}d · {worker.currentPeriod?.start} → {worker.currentPeriod?.end}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function AttendanceDay({ day }) {
  if (!day.status) return <View style={styles.calEmpty} />;
  const paid = day.accrualStatus === 'PAID';
  return (
    <View style={[styles.calDay, { backgroundColor: STATUS_COLORS[day.status] }, paid && styles.calPaid]}>
      <Text style={styles.calDayNum}>{day.date.slice(-2)}</Text>
    </View>
  );
}

function PaymentRow({ tx, isLatest }) {
  return (
    <View style={styles.payRow}>
      <View style={styles.payDot} />
      <View style={styles.payBody}>
        <View style={styles.payTop}>
          <Text style={styles.payAmount}>−{formatMoney(tx.amount)}</Text>
          {isLatest ? <Badge label="Latest" tone="brand" /> : null}
        </View>
        <Text style={styles.payMeta}>
          {METHOD_LABELS[tx.paymentMethod] || tx.paymentMethod}
          {tx.createdBy?.name ? ` · ${tx.createdBy.name}` : ''}
        </Text>
        {tx.notes ? <Text style={styles.payNote}>{tx.notes}</Text> : null}
        <Text style={styles.payDate}>{new Date(tx.createdAt).toLocaleString()}</Text>
      </View>
    </View>
  );
}

export default function WorkerProfileScreen({ route }) {
  const { id } = route.params;
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('attendance');

  const { from, to } = useMemo(() => monthBounds(year, month), [year, month]);
  const monthLabel = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    setLoading(true);
    api
      .get(`/workers/${id}/profile?from=${from}&to=${to}`)
      .then((res) => setProfile(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, from, to]);

  const calendarMap = useMemo(() => {
    const map = {};
    profile?.calendar?.forEach((d) => {
      map[d.date] = d;
    });
    return map;
  }, [profile]);

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let day = 1; day <= last.getDate(); day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ date: dateStr, ...calendarMap[dateStr] });
    }
    return cells;
  }, [year, month, calendarMap]);

  const changeMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  if (loading) return <LoadingView label="Loading profile..." />;
  if (error) return <ErrorBanner message={error} />;
  if (!profile) return null;

  const { worker, transactions, summary } = profile;
  const att = summary?.attendance || { present: 0, halfDay: 0, absent: 0, unmarked: 0 };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <WorkerHero worker={worker} />

      <View style={styles.stats}>
        <StatCard label="Total Paid" value={formatMoney(worker.totalPaid)} icon="checkmark-circle-outline" tone="success" />
        <StatCard label="Unpaid" value={formatMoney(worker.unpaidBalance)} icon="alert-circle-outline" tone="warning" />
        <StatCard label="Earned" value={formatMoney(summary?.monthEarned)} icon="calendar-outline" tone="brand" />
        <StatCard label="Paid (month)" value={formatMoney(summary?.monthPaid)} icon="wallet-outline" tone="default" />
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'attendance' && styles.tabActive]}
          onPress={() => setTab('attendance')}
        >
          <Text style={[styles.tabText, tab === 'attendance' && styles.tabTextActive]}>Attendance</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'payments' && styles.tabActive]}
          onPress={() => setTab('payments')}
        >
          <Text style={[styles.tabText, tab === 'payments' && styles.tabTextActive]}>
            Payments ({transactions.length})
          </Text>
        </Pressable>
      </View>

      {tab === 'attendance' ? (
        <Card style={styles.section} elevated>
          <View style={styles.monthNav}>
            <Pressable onPress={() => changeMonth(-1)} style={styles.monthBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable onPress={() => changeMonth(1)} style={styles.monthBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>
          </View>

          <View style={styles.attSummary}>
            <View style={[styles.attPill, { backgroundColor: '#dcfce7' }]}>
              <Text style={[styles.attPillVal, { color: colors.present }]}>{att.present}</Text>
              <Text style={styles.attPillLbl}>Present</Text>
            </View>
            <View style={[styles.attPill, { backgroundColor: '#fef9c3' }]}>
              <Text style={[styles.attPillVal, { color: colors.halfDay }]}>{att.halfDay}</Text>
              <Text style={styles.attPillLbl}>Half</Text>
            </View>
            <View style={[styles.attPill, { backgroundColor: '#ffe4e6' }]}>
              <Text style={[styles.attPillVal, { color: colors.absent }]}>{att.absent}</Text>
              <Text style={styles.attPillLbl}>Absent</Text>
            </View>
          </View>

          <View style={styles.calGrid}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={`${d}-${i}`} style={styles.calHead}>{d}</Text>
            ))}
            {grid.map((cell, idx) =>
              cell ? (
                <AttendanceDay key={cell.date} day={cell} />
              ) : (
                <View key={`pad-${idx}`} style={styles.calEmpty} />
              )
            )}
          </View>

          <View style={styles.legend}>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[key] }]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : (
        <Card style={styles.section} elevated>
          <Text style={styles.sectionTitle}>Payment history</Text>
          <Text style={styles.sectionSub}>
            {transactions.length} payments · {formatMoney(worker.totalDisbursed)} total
          </Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyPay}>No payments recorded yet</Text>
          ) : (
            <View style={styles.payList}>
              {transactions.map((tx, idx) => (
                <PaymentRow key={tx.id} tx={tx} isLatest={idx === 0} />
              ))}
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl },
  hero: { padding: spacing.lg, paddingTop: spacing.md, overflow: 'hidden' },
  heroGlow: {
    position: 'absolute',
    right: -30,
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  heroAvatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  heroText: { flex: 1 },
  heroNameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  heroPeriod: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 6 },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: -spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  tabActive: { backgroundColor: colors.surface, ...shadow('sm') },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  section: { marginHorizontal: spacing.md, gap: spacing.md },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthBtn: { padding: 8 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  attSummary: { flexDirection: 'row', gap: spacing.sm },
  attPill: { flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  attPillVal: { fontSize: 20, fontWeight: '800' },
  attPillLbl: { fontSize: 10, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calHead: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    paddingVertical: 6,
  },
  calDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    maxHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  calPaid: { borderWidth: 2, borderColor: colors.primary },
  calDayNum: { color: '#fff', fontSize: 12, fontWeight: '700' },
  calEmpty: { width: `${100 / 7}%`, aspectRatio: 1, maxHeight: 44 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: colors.textMuted },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  sectionSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  emptyPay: { textAlign: 'center', color: colors.textMuted, paddingVertical: 24 },
  payList: { gap: spacing.md, paddingTop: spacing.sm },
  payRow: { flexDirection: 'row', gap: spacing.md },
  payDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger,
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#fff',
    ...shadow('sm'),
  },
  payBody: { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: spacing.md },
  payTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payAmount: { fontSize: 18, fontWeight: '800', color: colors.danger },
  payMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  payNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  payDate: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
});
