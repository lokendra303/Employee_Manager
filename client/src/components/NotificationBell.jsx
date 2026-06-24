import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { Icon } from './ui';

export default function NotificationBell({ dropUp = false }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { unreadCount, notifications, loadNotifications, markRead, markAllRead } =
    useNotifications();

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) await loadNotifications();
  };

  const openItem = async (item) => {
    if (!item.readAt) await markRead(item.id);
    setOpen(false);
    if (item.entityType === 'FundRequest') {
      navigate('/fund-requests');
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative p-2 rounded-lg hover:bg-white/10 text-ink-300 hover:text-white transition"
        aria-label="Notifications"
      >
        <Icon name="bell" className="w-5 h-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute right-0 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-xl border border-ink-100 z-40 ${
              dropUp ? 'bottom-full mb-2' : 'mt-2'
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
              <p className="font-semibold text-ink-900 text-sm">Notifications</p>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  Mark all read
                </button>
              ) : null}
            </div>
            {notifications.length ? (
              <ul className="divide-y divide-ink-50">
                {notifications.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className={`w-full text-left px-4 py-3 hover:bg-ink-50 transition ${
                        !item.readAt ? 'bg-primary-50/50' : ''
                      }`}
                    >
                      <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                      <p className="text-xs text-ink-500 mt-1 line-clamp-2">{item.body}</p>
                      <p className="text-[10px] text-ink-400 mt-1">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-sm text-ink-500 text-center">No notifications yet</p>
            )}
            <div className="border-t border-ink-100 px-4 py-2">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                View all →
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
