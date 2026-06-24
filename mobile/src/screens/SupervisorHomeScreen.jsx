import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, ErrorBanner, LoadingView, Screen, StatCard } from '../components/ui';
import { colors } from '../theme';

export default function SupervisorHomeScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    workerCount: 0,
    markedToday: 0,
    unmarkedToday: 0,
    walletBalance: 0,
  });

  const load = useCallback(async () => {
    try {
      setError('');
      const today = new Date().toISOString().slice(0, 10);
      const workersUrl = user?.linkedDistributorId ? '/workers?scope=distributor' : '/workers';
      const [wRes, aRes, walletRes] = await Promise.all([
        api.get(workersUrl),
        api.get(`/attendance?date=${today}`),
        api.get('/wallet').catch(() => ({ data: { balance: 0 } })),
      ]);
      const grid = Array.isArray(aRes.data?.grid) ? aRes.data.grid : [];
      const marked = grid.filter((row) => row.attendance).length;
      setStats({
        workerCount: Array.isArray(wRes.data) ? wRes.data.length : 0,
        markedToday: marked,
        unmarkedToday: Math.max(0, grid.length - marked),
        walletBalance: walletRes.data?.balance ?? 0,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.linkedDistributorId]);

  useEffect(() => {
    load();
  }, [load]);

  const quickLinks = [
    { tab: 'Attendance', label: 'Mark Attendance', sub: "Today's worker check-in" },
    { tab: 'PaySalary', label: 'Pay Salary', sub: 'Record salary payments' },
    { tab: 'Wallet', label: 'My Wallet', sub: 'Balance and history' },
    { tab: 'FundRequests', title: 'Fund Requests', label: 'Fund Request', sub: 'Request organization funds' },
  ];

  if (user?.linkedDistributorId) {
    quickLinks.splice(1, 0, {
      tab: 'DistributorHome',
      label: 'Distributor Workers',
      sub: user.linkedDistributorName || 'Linked distributor payments',
    });
  }

  if (loading) return <LoadingView label="Loading..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Screen title={`Hello, ${user?.name?.split(' ')[0] || 'Supervisor'}`}>
          <ErrorBanner message={error} />

          <View style={styles.welcome}>
            <Text style={styles.org}>{user?.organizationName || 'Your organization'}</Text>
            <View style={styles.badges}>
              <Badge label="Supervisor" tone="brand" />
              {user?.linkedDistributorId ? (
                <Badge label="Also Distributor" tone="warning" />
              ) : null}
            </View>
            {user?.linkedDistributorName ? (
              <Text style={styles.linked}>Distributor: {user.linkedDistributorName}</Text>
            ) : null}
          </View>

          <View style={styles.stats}>
            <StatCard label="My Workers" value={String(stats.workerCount)} />
            <StatCard
              label="Marked Today"
              value={String(stats.markedToday)}
              sub={`${stats.unmarkedToday} unmarked`}
            />
            <StatCard
              label="Wallet Balance"
              value={`₹${stats.walletBalance.toLocaleString()}`}
              sub="Available to pay"
            />
          </View>

          <Text style={styles.section}>Quick actions</Text>
          {quickLinks.map((link) => (
            <Pressable
              key={link.tab}
              style={styles.linkRow}
              onPress={() => navigation.navigate(link.tab)}
            >
              <View>
                <Text style={styles.linkTitle}>{link.label}</Text>
                <Text style={styles.linkSub}>{link.sub}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 24 },
  welcome: { paddingHorizontal: 16, marginBottom: 8 },
  org: { fontSize: 14, color: colors.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  linked: { fontSize: 12, color: colors.warning, marginTop: 8 },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  section: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  linkSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.textMuted },
});
