import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import ScreenLayout from '../components/ScreenLayout';
import {
  Badge,
  ErrorBanner,
  LoadingView,
  QuickActionCard,
  SectionTitle,
  StatCard,
} from '../components/ui';
import { spacing } from '../theme';

const QUICK_ICONS = {
  Attendance: 'calendar-outline',
  PaySalary: 'cash-outline',
  Wallet: 'wallet-outline',
  FundRequests: 'send-outline',
  DistributorHome: 'business-outline',
};

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
    { tab: 'FundRequests', label: 'Fund Request', sub: 'Request organization funds' },
  ];

  if (user?.linkedDistributorId) {
    quickLinks.splice(1, 0, {
      tab: 'DistributorHome',
      label: 'Distributor Workers',
      sub: user.linkedDistributorName || 'Linked distributor payments',
    });
  }

  if (loading) return <LoadingView label="Loading..." />;

  const firstName = user?.name?.split(' ')[0] || 'Supervisor';

  return (
    <ScreenLayout
      title={`Hello, ${firstName}`}
      subtitle={user?.organizationName || 'Your organization'}
      headerDark
      showNotifications
      onNotificationsPress={() => navigation.navigate('Notifications')}
      edges={[]}
    >
      <ErrorBanner message={error} />

      <View style={styles.badges}>
        <Badge label="Supervisor" tone="brand" />
        {user?.linkedDistributorId ? <Badge label="Also Distributor" tone="warning" /> : null}
      </View>
      {user?.linkedDistributorName ? (
        <Text style={styles.linked}>Distributor: {user.linkedDistributorName}</Text>
      ) : null}

      <SectionTitle title="Today" />
      <View style={styles.stats}>
        <StatCard label="My Workers" value={String(stats.workerCount)} icon="people-outline" tone="brand" />
        <StatCard
          label="Marked Today"
          value={String(stats.markedToday)}
          sub={`${stats.unmarkedToday} unmarked`}
          icon="checkmark-circle-outline"
          tone="success"
        />
        <StatCard
          label="Wallet Balance"
          value={`₹${stats.walletBalance.toLocaleString()}`}
          sub="Available to pay"
          icon="wallet-outline"
          tone="warning"
        />
      </View>

      <SectionTitle title="Quick actions" />
      <View style={styles.links}>
        {quickLinks.map((link) => (
          <QuickActionCard
            key={link.tab}
            icon={QUICK_ICONS[link.tab] || 'arrow-forward-outline'}
            label={link.label}
            sub={link.sub}
            onPress={() => navigation.navigate(link.tab)}
          />
        ))}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  linked: { fontSize: 13, color: '#b45309', fontWeight: '600' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  links: { gap: spacing.sm },
});
