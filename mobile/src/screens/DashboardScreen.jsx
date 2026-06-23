import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import { ErrorBanner, LoadingView, Screen, StatCard } from '../components/ui';
import { colors } from '../theme';

export default function DashboardScreen() {
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen
        title="Dashboard"
        subtitle={summary?.organizationName || 'Organization overview'}
      >
        <ErrorBanner message={error} />
        <View style={styles.stats}>
          <StatCard label="Active Workers" value={String(summary?.workerCount ?? 0)} />
          <StatCard label="Distributors" value={String(summary?.distributorCount ?? 0)} />
          <StatCard
            label="Marked Today"
            value={String(summary?.todayAttendance ?? 0)}
            sub={`${summary?.unmarkedToday ?? 0} unmarked`}
          />
          <StatCard
            label="Pending Pay"
            value={`₹${(summary?.pendingAccrualTotal ?? 0).toLocaleString()}`}
            sub={`${summary?.pendingAccrualCount ?? 0} accruals`}
          />
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
});
