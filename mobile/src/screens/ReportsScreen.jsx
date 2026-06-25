import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import ScreenLayout from '../components/ScreenLayout';
import { Badge, Card, ErrorBanner, LoadingView, SectionTitle, StatCard } from '../components/ui';
import { colors, radius, shadow, spacing } from '../theme';

function formatMoney(value) {
  return `₹${(Number(value) || 0).toLocaleString()}`;
}

function monthRange(offset = 0) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const from = d.toISOString().slice(0, 10);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

function WorkerReportCard({ row }) {
  return (
    <Card style={styles.workerCard} elevated>
      <View style={styles.workerHeader}>
        <Text style={styles.workerName}>{row.workerName}</Text>
        <Badge label={`${row.effectiveDays} days`} tone="brand" />
      </View>
      <View style={styles.workerStats}>
        <View style={[styles.miniStat, styles.presentBox]}>
          <Text style={styles.miniLabel}>Present</Text>
          <Text style={[styles.miniValue, { color: colors.present }]}>{row.presentDays}</Text>
        </View>
        <View style={[styles.miniStat, styles.halfBox]}>
          <Text style={styles.miniLabel}>Half</Text>
          <Text style={[styles.miniValue, { color: colors.halfDay }]}>{row.halfDays}</Text>
        </View>
        <View style={[styles.miniStat, styles.paidBox]}>
          <Text style={styles.miniLabel}>Paid</Text>
          <Text style={[styles.miniValue, { color: colors.success }]}>{formatMoney(row.totalPaid)}</Text>
        </View>
        <View style={[styles.miniStat, styles.pendingBox]}>
          <Text style={styles.miniLabel}>Pending</Text>
          <Text style={[styles.miniValue, { color: colors.warning }]}>{formatMoney(row.totalPending)}</Text>
        </View>
      </View>
    </Card>
  );
}

function ProjectBalanceCard({ project }) {
  return (
    <Card style={styles.projectCard} elevated>
      <View style={styles.workerHeader}>
        <Text style={styles.workerName}>{project.name}</Text>
        <Badge label={`${project.workerCount} workers`} tone="neutral" />
      </View>
      <View style={styles.projectRows}>
        <View style={styles.projectRow}>
          <Text style={styles.projectLabel}>Credits</Text>
          <Text style={styles.projectValue}>{formatMoney(project.totalCredits)}</Text>
        </View>
        <View style={styles.projectRow}>
          <Text style={styles.projectLabel}>Paid out</Text>
          <Text style={[styles.projectValue, { color: colors.danger }]}>
            −{formatMoney(project.totalDisbursements)}
          </Text>
        </View>
        <View style={[styles.projectRow, styles.projectBalanceRow]}>
          <Text style={styles.projectBalanceLabel}>Balance</Text>
          <Text style={styles.projectBalanceValue}>{formatMoney(project.balance)}</Text>
        </View>
      </View>
    </Card>
  );
}

export default function ReportsScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState('workers');
  const [range, setRange] = useState(() => monthRange(0));
  const [daysReport, setDaysReport] = useState(null);
  const [reconciliation, setReconciliation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const requests = [api.get(`/reports/days-worked?from=${range.from}&to=${range.to}`)];
      if (isAdmin) {
        requests.push(api.get('/reports/distributor-reconciliation').catch(() => ({ data: [] })));
      }
      const results = await Promise.all(requests);
      setDaysReport(results[0].data);
      setReconciliation(isAdmin ? results[1]?.data || [] : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [range.from, range.to, isAdmin]);

  const totals = useMemo(() => {
    const rows = daysReport?.report || [];
    return rows.reduce(
      (acc, r) => ({
        workers: acc.workers + 1,
        effective: acc.effective + (r.effectiveDays || 0),
        paid: acc.paid + (r.totalPaid || 0),
        pending: acc.pending + (r.totalPending || 0),
      }),
      { workers: 0, effective: 0, paid: 0, pending: 0 }
    );
  }, [daysReport]);

  if (loading && !daysReport) return <LoadingView label="Loading reports..." />;

  const rows = daysReport?.report || [];

  return (
    <ScreenLayout
      title="Reports"
      subtitle="Days worked, salary summary & project balances"
      headerDark
      showNotifications
      onNotificationsPress={() => navigation.navigate('Notifications')}
      edges={[]}
    >
      <ErrorBanner message={error} />

      <View style={styles.rangeCard}>
        <Text style={styles.rangeLabel}>
          {daysReport?.from} → {daysReport?.to}
        </Text>
        <View style={styles.rangeBtns}>
          <Pressable
            style={[styles.rangeBtn, range.from === monthRange(0).from && styles.rangeBtnActive]}
            onPress={() => setRange(monthRange(0))}
          >
            <Text style={[styles.rangeBtnText, range.from === monthRange(0).from && styles.rangeBtnTextActive]}>
              This month
            </Text>
          </Pressable>
          <Pressable
            style={[styles.rangeBtn, range.from === monthRange(-1).from && styles.rangeBtnActive]}
            onPress={() => setRange(monthRange(-1))}
          >
            <Text style={[styles.rangeBtnText, range.from === monthRange(-1).from && styles.rangeBtnTextActive]}>
              Last month
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.stats}>
        <StatCard label="Workers" value={String(totals.workers)} icon="people-outline" tone="brand" />
        <StatCard label="Eff. days" value={String(totals.effective.toFixed(1))} icon="calendar-outline" tone="default" />
        <StatCard label="Paid" value={formatMoney(totals.paid)} icon="checkmark-circle-outline" tone="success" />
        <StatCard label="Pending" value={formatMoney(totals.pending)} icon="alert-circle-outline" tone="warning" />
      </View>

      {isAdmin ? (
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, tab === 'workers' && styles.tabActive]}
            onPress={() => setTab('workers')}
          >
            <Text style={[styles.tabText, tab === 'workers' && styles.tabTextActive]}>Workers</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'projects' && styles.tabActive]}
            onPress={() => setTab('projects')}
          >
            <Text style={[styles.tabText, tab === 'projects' && styles.tabTextActive]}>Projects</Text>
          </Pressable>
        </View>
      ) : null}

      {tab === 'workers' || !isAdmin ? (
        <>
          <SectionTitle title="Days worked & salary" />
          {!rows.length ? (
            <Text style={styles.empty}>No data for this period</Text>
          ) : (
            rows.map((row) => <WorkerReportCard key={row.workerId} row={row} />)
          )}
        </>
      ) : (
        <>
          <SectionTitle title="Project / site balances" />
          {!reconciliation.length ? (
            <Text style={styles.empty}>No projects yet</Text>
          ) : (
            reconciliation.map((p) => <ProjectBalanceCard key={p.id} project={p} />)
          )}
        </>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  rangeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow('sm'),
  },
  rangeLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  rangeBtns: { flexDirection: 'row', gap: spacing.sm },
  rangeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
  },
  rangeBtnActive: { backgroundColor: colors.primary },
  rangeBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  rangeBtnTextActive: { color: '#fff' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: spacing.md,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  tabActive: { backgroundColor: colors.surface, ...shadow('sm') },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  workerCard: { marginBottom: spacing.sm, gap: spacing.sm },
  workerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  workerName: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 },
  workerStats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  miniStat: { flex: 1, minWidth: '45%', borderRadius: radius.md, padding: spacing.sm },
  presentBox: { backgroundColor: '#dcfce7' },
  halfBox: { backgroundColor: '#fef9c3' },
  paidBox: { backgroundColor: colors.successSoft },
  pendingBox: { backgroundColor: colors.warningSoft },
  miniLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: colors.textMuted },
  miniValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  projectCard: { marginBottom: spacing.sm, gap: spacing.sm },
  projectRows: { gap: 8 },
  projectRow: { flexDirection: 'row', justifyContent: 'space-between' },
  projectLabel: { fontSize: 13, color: colors.textMuted },
  projectValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  projectBalanceRow: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 8, marginTop: 4 },
  projectBalanceLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  projectBalanceValue: { fontSize: 16, fontWeight: '800', color: colors.primary },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 32 },
});
