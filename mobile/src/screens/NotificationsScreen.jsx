import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { useNotifications } from '../hooks/useNotifications';
import { LoadingView } from '../components/ui';
import { colors, radius, shadow, spacing, typography } from '../theme';

function formatWhen(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString();
}

const TYPE_ICONS = {
  FUND_REQUEST_CREATED: 'cash-outline',
  FUND_REQUEST_APPROVED: 'checkmark-circle-outline',
  FUND_REQUEST_REJECTED: 'close-circle-outline',
  FUND_REQUEST_SENT: 'send-outline',
  FUND_REQUEST_RECEIVED: 'wallet-outline',
  FUND_REQUEST_DISPUTED: 'alert-circle-outline',
  FUND_REQUEST_NOTE: 'chatbubble-outline',
};

export default function NotificationsScreen({ navigation }) {
  const { notifications, loading, loadNotifications, markRead, markAllRead, unreadCount } =
    useNotifications({ pollMs: 30000 });

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const openNotification = async (item) => {
    if (!item.readAt) await markRead(item.id);
    if (item.entityType === 'FundRequest' && item.entityId) {
      navigation.navigate('FundRequests', { highlightId: item.entityId });
    }
  };

  if (loading) return <LoadingView label="Loading notifications..." />;

  return (
    <ScreenLayout
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
      headerDark
      edges={[]}
      scroll={false}
      rightAction={
        unreadCount > 0 ? (
          <Pressable onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAll}>Read all</Text>
          </Pressable>
        ) : null
      }
    >
      <FlatList
        style={styles.listFlex}
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={notifications.length ? styles.list : styles.emptyWrap}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
            <Text style={styles.empty}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, !item.readAt && styles.unread]}
            onPress={() => openNotification(item)}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconWrap, !item.readAt && styles.iconWrapUnread]}>
                <Ionicons
                  name={TYPE_ICONS[item.type] || 'notifications-outline'}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody}>{item.body}</Text>
                <Text style={styles.cardTime}>{formatWhen(item.createdAt)}</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  markAll: { fontSize: 13, fontWeight: '700', color: '#fff' },
  listFlex: { flex: 1 },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  emptyBox: { alignItems: 'center', gap: spacing.md },
  empty: { ...typography.subtitle, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow('sm'),
  },
  unread: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryLight },
  cardRow: { flexDirection: 'row', gap: spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: { backgroundColor: '#fff' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardBody: { fontSize: 14, color: colors.textMuted, marginTop: 4, lineHeight: 20 },
  cardTime: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
});
