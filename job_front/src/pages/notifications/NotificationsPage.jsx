import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, CheckCheck, RefreshCw, Loader2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { NotificationItem } from '../../components/notifications/NotificationItem';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { getNotificationPath } from '../../utils/notificationUtils';

export function NotificationsPage({ breadcrumbs }) {
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    error,
    meta,
    isLoaded,
    loadNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useNotificationContext();

  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  // Load on first visit to this page
  useEffect(() => {
    if (!isLoaded) loadNotifications(1);
  }, [isLoaded, loadNotifications]);

  const displayed = filter === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const hasMore = meta.current_page < meta.last_page && filter === 'all';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notifications"
        subtitle="Manage and review all your notifications"
        breadcrumbs={breadcrumbs}
      />

      <div className="card">
        {/* Toolbar */}
        <div
          className="px-4 py-3 flex items-center justify-between flex-wrap gap-3"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          {/* Filter tabs */}
          <div className="flex items-center gap-1">
            {[
              { key: 'all',    label: 'All' },
              { key: 'unread', label: unreadCount > 0 ? `Unread (${unreadCount})` : 'Unread' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: filter === key ? 'var(--primary-light)' : 'transparent',
                  color:      filter === key ? 'var(--primary)'       : 'var(--text-secondary)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--primary)';
                  e.currentTarget.style.color      = 'var(--text-on-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--primary-light)';
                  e.currentTarget.style.color      = 'var(--primary)';
                }}
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Notification list */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm" style={{ color: 'var(--clr-danger-a10)' }}>{error}</p>
              <button
                onClick={refresh}
                className="text-sm font-medium"
                style={{ color: 'var(--primary)' }}
              >
                Try again
              </button>
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--bg-hover)' }}
              >
                <BellOff size={24} style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {filter === 'unread'
                  ? "You're all caught up!"
                  : 'Notifications will appear here when they arrive.'}
              </p>
            </div>
          ) : (
            <>
              {displayed.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClick={() => {
                    if (!n.is_read) markAsRead(n.id);
                    const path = getNotificationPath(n);
                    if (path) navigate(path);
                  }}
                  onMarkAsRead={() => markAsRead(n.id)}
                  onDelete={() => deleteNotification(n.id)}
                />
              ))}
              {hasMore && (
                <div className="py-4 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--primary)';
                      e.currentTarget.style.color      = 'var(--text-on-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--primary-light)';
                      e.currentTarget.style.color      = 'var(--primary)';
                    }}
                  >
                    {loadingMore
                      ? <><Loader2 size={14} className="animate-spin" /> Loading…</>
                      : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
