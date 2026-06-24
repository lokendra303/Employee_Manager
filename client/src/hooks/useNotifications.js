import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';

export function useNotifications({ pollMs = 60000, enabled = true } = {}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshUnread = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data?.count ?? 0);
    } catch {
      /* offline */
    }
  }, [enabled]);

  const loadNotifications = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data ?? []);
      await refreshUnread();
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, refreshUnread]);

  const markRead = useCallback(async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.post('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    refreshUnread();
    const timer = setInterval(refreshUnread, pollMs);
    return () => clearInterval(timer);
  }, [enabled, pollMs, refreshUnread]);

  return {
    unreadCount,
    notifications,
    loading,
    refreshUnread,
    loadNotifications,
    markRead,
    markAllRead,
  };
}
