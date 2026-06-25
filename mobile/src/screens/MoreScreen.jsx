import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { getMoreLinks } from '../navigation/roleTabs';
import AppHeader, { ListRow } from '../components/AppHeader';
import ScreenLayout from '../components/ScreenLayout';
import { FadeInUp } from '../components/motion';
import { SectionTitle } from '../components/ui';
import { colors, gradients, radius, spacing, typography } from '../theme';

const LINK_ICONS = {
  FundRequests: 'cash-outline',
  Profile: 'person-outline',
  Workers: 'people-outline',
  AdminDistributors: 'briefcase-outline',
  AdminSupervisors: 'shield-checkmark-outline',
  AdminPayments: 'card-outline',
  AdminReports: 'bar-chart-outline',
  Wallet: 'wallet-outline',
  Transactions: 'swap-horizontal-outline',
  Reports: 'document-text-outline',
  PaySalary: 'cash-outline',
  Attendance: 'calendar-outline',
  DistributorHome: 'business-outline',
};

export default function MoreScreen({ navigation }) {
  const { user, logout } = useAuth();
  const links = getMoreLinks(user);
  const parent = navigation.getParent();

  const goTo = (screen) => {
    if (parent) parent.navigate(screen);
    else navigation.navigate(screen);
  };

  const openNotifications = () => goTo('Notifications');

  return (
    <ScreenLayout edges={[]} scroll={false}>
      <AppHeader
        title="More"
        subtitle={user?.role === 'ADMIN' ? 'Admin tools & settings' : 'Tools & settings'}
        dark
        onNotificationsPress={openNotifications}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <FadeInUp delay={100}>
          <LinearGradient colors={gradients.primary} style={styles.profileCard}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileMeta}>{user?.organizationName}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>{user?.role?.replace(/_/g, ' ')}</Text>
            </View>
          </LinearGradient>
        </FadeInUp>

        <SectionTitle title="Menu" />
        <View style={styles.list}>
          <ListRow
            icon="notifications-outline"
            label="Notifications"
            sublabel="Fund requests & alerts"
            onPress={openNotifications}
          />
          {links.map((link, i) => (
            <ListRow
              key={link.screen}
              icon={LINK_ICONS[link.screen] || 'ellipse-outline'}
              label={link.title}
              onPress={() => goTo(link.screen)}
              delay={i * 60}
            />
          ))}
        </View>

        <ListRow
          icon="log-out-outline"
          label="Sign out"
          onPress={logout}
          danger
          chevron={false}
        />
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  profileCard: {
    alignItems: 'flex-start',
    gap: 4,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  profileName: { ...typography.title, fontSize: 20, color: '#fff' },
  profileMeta: { ...typography.subtitle, color: 'rgba(255,255,255,0.8)' },
  rolePill: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: { gap: spacing.sm },
});
