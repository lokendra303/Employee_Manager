import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../hooks/useNotifications';
import { colors, shadow } from '../theme';

export default function NotificationBell({ onPress, size = 24, light = false }) {
  const { unreadCount } = useNotifications();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.wrap, light && styles.wrapLight]}
      hitSlop={10}
      accessibilityLabel="Notifications"
    >
      <Ionicons
        name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
        size={size}
        color={light ? '#fff' : colors.text}
      />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    ...shadow('sm'),
  },
  wrapLight: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
