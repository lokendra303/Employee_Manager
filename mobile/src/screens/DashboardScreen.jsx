import { useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import ScreenLayout from '../components/ScreenLayout';
import { ErrorBanner, LoadingView, QuickActionCard, SectionTitle, StatCard } from '../components/ui';
import { spacing } from '../theme';

export default function DashboardScreen({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/reports/summary')
      .then((res) => setSummary(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingView label="Loading dashboard..." />;

  return (
    <ScreenLayout
      title="Dashboard"
      subtitle={summary?.organizationName || 'Organization overview'}
      headerDark
      showNotifications
      onNotificationsPress={() => navigation.navigate('Notifications')}
      edges={[]}
    >
      <ErrorBanner message={error} />

      <SectionTitle title="Quick actions" />
      <View style={styles.quick}>
        <QuickActionCard
          icon="business-outline"
          label="Add Project / Site"
          sub="Create job site first"
          onPress={() => navigation.getParent()?.navigate('AdminDistributors')}
          delay={0}
        />
        <QuickActionCard
          icon="person-add-outline"
          label="Add Worker"
          sub="Assign to a project"
          onPress={() => navigation.navigate('Workers')}
          delay={60}
        />
      </View>

      <SectionTitle title="Overview" />
      <View style={styles.stats}>
        <StatCard
          label="Active Workers"
          value={String(summary?.workerCount ?? 0)}
          icon="people-outline"
          tone="brand"
          delay={0}
        />
        <StatCard
          label="Projects / Sites"
          value={String(summary?.distributorCount ?? 0)}
          icon="briefcase-outline"
          delay={80}
        />
        <StatCard
          label="Marked Today"
          value={String(summary?.todayAttendance ?? 0)}
          sub={`${summary?.unmarkedToday ?? 0} unmarked`}
          icon="calendar-outline"
          tone="success"
          delay={160}
        />
        <StatCard
          label="Pending Pay"
          value={`₹${(summary?.pendingAccrualTotal ?? 0).toLocaleString()}`}
          sub={`${summary?.pendingAccrualCount ?? 0} accruals`}
          icon="wallet-outline"
          tone="warning"
          delay={240}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  quick: { gap: spacing.sm, marginBottom: spacing.md },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
