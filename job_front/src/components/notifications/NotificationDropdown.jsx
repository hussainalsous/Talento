import { Link, useNavigate } from 'react-router-dom';
import { BellOff, CheckCheck, Loader2 } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import { getNotificationPath } from '../../utils/notificationUtils';

export function NotificationDropdown({
  notifications,
  unreadCount,
  loading,
  loadingMore,
  error,
  meta,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onLoadMore,
  onClose,
  viewAllPath,
}) {
  const navigate  = useNavigate();
  const hasMore   = meta.current_page < meta.last_page;
  const hasUnread = unreadCount > 0;

  return (
    <div
      className="absolute right-0 top-full mt-2 flex flex-col rounded-xl animate-fade-in"
      style={{
        width:     '380px',
        maxHeight: '520px',
        background: 'var(--bg-card)',
        border:    '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-lg)',
        zIndex:    50,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Notifications
          </span>
          {hasUnread && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
            >
              {unreadCount} unread
            </span>
          )}
        </div>
        {hasUnread && (
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: 'var(--primary)' }}
            title="Mark all as read"
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
        )}
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--primary)' }} />
          </div>
        ) : error ? (
          <div className="py-10 px-4 text-center">
            <p className="text-sm" style={{ color: 'var(--clr-danger-a10)' }}>{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'var(--bg-hover)' }}
            >
              <BellOff size={22} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              No notifications
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              You&apos;re all caught up!
            </p>
          </div>
        ) : (
          <>
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={() => {
                  if (!n.is_read) onMarkAsRead(n.id);
                  const path = getNotificationPath(n);
                  onClose();
                  if (path) navigate(path);
                }}
                onMarkAsRead={() => onMarkAsRead(n.id)}
                onDelete={() => onDelete(n.id)}
              />
            ))}
            {hasMore && (
              <div className="py-3 flex items-center justify-center">
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-1 text-xs font-medium transition-colors"
                  style={{ color: 'var(--primary)' }}
                >
                  {loadingMore
                    ? <><Loader2 size={12} className="animate-spin" /> Loading…</>
                    : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {viewAllPath && (
        <div
          className="px-4 py-2.5 text-center shrink-0"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
          <Link
            to={viewAllPath}
            onClick={onClose}
            className="text-xs font-medium"
            style={{ color: 'var(--primary)' }}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
