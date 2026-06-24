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
  DistributorHome: 'people-outline',
  Wallet: 'wallet-outline',
  FundRequests: 'send-outline',
  Transactions: 'swap-horizontal-outline',
  Reports: 'bar-chart-outline',
};

export default function DistributorDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  const load = useCallback(async () => {
    try {
      setError('');
      const [dRes, walletRes] = await Promise.all([
        api.get('/distributors'),
        api.get('/wallet').catch(() => ({ data: { balance: 0 } })),
      ]);
      const distributor = Array.isArray(dRes.data) ? dRes.data[0] : null;
      setProfile(distributor);
      setWalletBalance(walletRes.data?.balance ?? 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const quickLinks = [
    { tab: 'DistributorHome', label: 'Workers Owed', sub: 'Pay outstanding worker balances' },
    { tab: 'Wallet', label: 'My Wallet', sub: 'Balance and disbursements' },
    { tab: 'FundRequests', label: 'Fund Request', sub: 'Request organization funds' },
    { tab: 'Transactions', label: 'Payment Ledger', sub: 'Recent worker payments' },
    { tab: 'Reports', label: 'Reports', sub: 'Days worked and earnings' },
  ];

  if (loading) return <LoadingView label="Loading..." />;

  const displayName =
    profile?.name || user?.linkedDistributorName || user?.name?.split(' ')[0] || 'Distributor';

  return (
    <ScreenLayout
      title={`Hello, ${displayName.split(' ')[0]}`}
      subtitle={user?.organizationName || 'Your organization'}
      headerDark
      showNotifications
      onNotificationsPress={() => navigation.navigate('Notifications')}
      edges={[]}
    >
      <ErrorBanner message={error} />

      <View style={styles.badges}>
        <Badge label="Distributor" tone="brand" />
      </View>
      {profile?.contactPhone ? <Text style={styles.contact}>{profile.contactPhone}</Text> : null}
      {!profile ? (
        <Text style={styles.warning}>
          No distributor profile linked. Ask your admin to link your login.
        </Text>
      ) : null}

      <SectionTitle title="Overview" />
      <View style={styles.stats}>
        <StatCard
          label="Wallet Balance"
          value={`₹${walletBalance.toLocaleString()}`}
          sub="Available funds"
          icon="wallet-outline"
          tone="brand"
        />
        <StatCard
          label="Opening Balance"
          value={`₹${(profile?.openingBalance ?? 0).toLocaleString()}`}
          icon="trending-up-outline"
        />
        <StatCard
          label="Workers"
          value={String(profile?.workerCount ?? 0)}
          icon="people-outline"
          tone="success"
        />
      </View>

      <SectionTitle title="Quick actions" />
      <View style={styles.links}>
        {quickLinks.map((link) => (
          <QuickActionCard
            key={link.tab}
            icon={QUICK_ICONS[link.tab]}
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
  contact: { fontSize: 13, color: '#64748b' },
  warning: { fontSize: 13, color: '#b45309', fontWeight: '600' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  links: { gap: spacing.sm },
});
