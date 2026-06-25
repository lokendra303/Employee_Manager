import { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getTabsForUser } from './roleTabs';
import { colors, tabBarStyle } from '../theme';

import DashboardScreen from '../screens/DashboardScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import WorkersScreen from '../screens/WorkersScreen';
import WorkerProfileScreen from '../screens/WorkerProfileScreen';
import WalletScreen from '../screens/WalletScreen';
import FundRequestsScreen from '../screens/FundRequestsScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import PaySalaryScreen from '../screens/PaySalaryScreen';
import DistributorHomeScreen from '../screens/DistributorHomeScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MoreScreen from '../screens/MoreScreen';
import SystemAdminScreen from '../screens/SystemAdminScreen';
import DistributorsScreen from '../screens/DistributorsScreen';
import SupervisorsScreen from '../screens/SupervisorsScreen';
import SupervisorHomeScreen from '../screens/SupervisorHomeScreen';
import DistributorDashboardScreen from '../screens/DistributorDashboardScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ApiSettingsScreen from '../screens/ApiSettingsScreen';

function SystemAdminApiSettings(props) {
  const { user } = useAuth();
  useEffect(() => {
    if (user?.role !== 'SYSTEM_ADMIN') {
      props.navigation.goBack();
    }
  }, [user, props.navigation]);
  if (user?.role !== 'SYSTEM_ADMIN') return null;
  return <ApiSettingsScreen {...props} />;
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const screenMap = {
  Dashboard: DashboardScreen,
  Attendance: AttendanceScreen,
  Workers: WorkersScreen,
  FundRequests: FundRequestsScreen,
  More: MoreScreen,
  Wallet: WalletScreen,
  PaySalary: PaySalaryScreen,
  Transactions: TransactionsScreen,
  DistributorHome: DistributorHomeScreen,
  Reports: ReportsScreen,
  Profile: ProfileScreen,
  SystemAdmin: SystemAdminScreen,
  SupervisorHome: SupervisorHomeScreen,
  DistributorDashboard: DistributorDashboardScreen,
};

function RoleTabs() {
  const { user } = useAuth();
  const tabs = getTabsForUser(user);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: Platform.OS === 'android' ? 2 : 0,
          letterSpacing: 0.2,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          paddingTop: 8,
          ...tabBarStyle,
        },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={screenMap[tab.name]}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { flex: 1, backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={RoleTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WorkerProfile"
        component={WorkerProfileScreen}
        options={{ title: 'Worker Profile' }}
      />
      <Stack.Screen
        name="AdminDistributors"
        component={DistributorsScreen}
        options={{ title: 'Distributors' }}
      />
      <Stack.Screen
        name="AdminSupervisors"
        component={SupervisorsScreen}
        options={{ title: 'Supervisors' }}
      />
      <Stack.Screen
        name="AdminPayments"
        component={TransactionsScreen}
        options={{ title: 'Payments' }}
      />
      <Stack.Screen
        name="AdminReports"
        component={ReportsScreen}
        options={{ title: 'Reports' }}
      />
      <Stack.Screen
        name="AdminPaySalary"
        component={PaySalaryScreen}
        options={{ title: 'Pay Salary' }}
      />
      <Stack.Screen
        name="FundRequests"
        component={FundRequestsScreen}
        options={{ title: 'Fund Requests' }}
      />
      <Stack.Screen
        name="DistributorHome"
        component={DistributorHomeScreen}
        options={{ title: 'Distributor Workers' }}
      />
      <Stack.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: 'Payments' }}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Reports' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="ApiSettings"
        component={SystemAdminApiSettings}
        options={{ title: 'API URL' }}
      />
    </Stack.Navigator>
  );
}
