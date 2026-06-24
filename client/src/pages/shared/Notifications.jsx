import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, loading, loadNotifications, markRead, markAllRead, unreadCount } =
    useNotifications({ pollMs: 30000 });

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const openItem = async (item) => {
    if (!item.readAt) await markRead(item.id);
    if (item.entityType === 'FundRequest') navigate('/fund-requests');
  };

  if (loading) {
    return <p className="text-ink-500 text-sm">Loading notifications...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Notifications</h1>
          <p className="text-sm text-ink-500 mt-1">Fund requests and notes</p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={markAllRead}
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      {notifications.length ? (
        <ul className="space-y-3">
          {notifications.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openItem(item)}
                className={`w-full text-left card p-4 hover:border-primary-200 transition ${
                  !item.readAt ? 'border-primary-200 bg-primary-50/30' : ''
                }`}
              >
                <p className="font-semibold text-ink-900">{item.title}</p>
                <p className="text-sm text-ink-600 mt-2">{item.body}</p>
                <p className="text-xs text-ink-400 mt-2">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card p-8 text-center text-ink-500 text-sm">No notifications yet</div>
      )}
    </div>
  );
}
