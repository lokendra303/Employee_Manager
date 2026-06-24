import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, ErrorBanner, LoadingView, Screen, StatCard } from '../components/ui';
import { colors } from '../theme';

function formatMoney(value) {
  return `₹${(Number(value) || 0).toLocaleString()}`;
}

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Screen title={`Hello, ${displayName.split(' ')[0]}`}>
          <ErrorBanner message={error} />

          <View style={styles.welcome}>
            <Text style={styles.org}>{user?.organizationName || 'Your organization'}</Text>
            <View style={styles.badges}>
              <Badge label="Distributor" tone="brand" />
            </View>
            {profile?.contactPhone ? (
              <Text style={styles.contact}>{profile.contactPhone}</Text>
            ) : null}
            {!profile ? (
              <Text style={styles.warning}>
                No distributor profile linked to this account. Ask your admin to link your login.
              </Text>
            ) : null}
          </View>

          <View style={styles.stats}>
            <StatCard label="Workers" value={String(profile?.workerCount ?? 0)} />
            <StatCard
              label="Pending Pay"
              value={formatMoney(profile?.totalPending)}
              sub="Accrued to workers"
            />
            <StatCard
              label="Wallet Balance"
              value={formatMoney(walletBalance)}
              sub="Available to pay"
            />
            <StatCard
              label="Total Paid"
              value={formatMoney(profile?.totalPaid)}
              sub={`Opening ${formatMoney(profile?.openingBalance)}`}
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
  contact: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  warning: { fontSize: 12, color: colors.warning, marginTop: 8 },
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
