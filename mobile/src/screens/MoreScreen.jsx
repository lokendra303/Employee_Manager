import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getMoreLinks } from '../navigation/roleTabs';
import { Screen } from '../components/ui';
import { colors } from '../theme';

export default function MoreScreen({ navigation }) {
  const { user, logout } = useAuth();
  const links = getMoreLinks(user);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen
        title="More"
        subtitle={
          user?.role === 'ADMIN'
            ? 'Admin tools and settings'
            : 'Tools, profile, and settings'
        }
      >
        <ScrollView contentContainerStyle={styles.list}>
          {links.map((link) => (
            <Pressable
              key={link.screen}
              style={styles.row}
              onPress={() => {
                const parent = navigation.getParent();
                if (parent) parent.navigate(link.screen);
                else navigation.navigate(link.screen);
              }}
            >
              <Text style={styles.rowText}>{link.title}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('ApiSettings')}
          >
            <Text style={styles.rowText}>API URL</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable style={[styles.row, styles.logout]} onPress={logout}>
            <Text style={styles.logoutText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  rowText: { fontSize: 16, fontWeight: '500', color: colors.text },
  logout: { marginTop: 16, borderColor: '#fecaca' },
  logoutText: { color: colors.danger, fontWeight: '600', fontSize: 16 },
});
