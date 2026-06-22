import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuthStore } from '../../app/useAuthStore';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { NotificationDropdown } from './NotificationDropdown';

function getViewAllPath(user) {
  if (!user?.role) return null;
  if (user.role === 'admin' || user.role === 'super_admin')        return '/admin/notifications';
  if (user.role === 'company_owner' || user.role === 'company_member') return '/company/notifications';
  if (user.role === 'job_seeker') return '/job-seeker/notifications';
  return null;
}

export function NotificationBell() {
  const user        = useAuthStore((s) => s.user);
  const viewAllPath = getViewAllPath(user);

  const {
    notifications, unreadCount, loading, loadingMore, error, meta, isLoaded,
    loadNotifications, loadMore, markAsRead, markAllAsRead, deleteNotification,
  } = useNotificationContext();

  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Load list on first open
  useEffect(() => {
    if (isOpen && !isLoaded) loadNotifications(1);
  }, [isOpen, isLoaded, loadNotifications]);

  const badge = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 rounded-lg transition-colors"
        title="Notifications"
        style={{ color: isOpen ? 'var(--primary)' : 'var(--text-secondary)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = isOpen ? 'var(--bg-active)' : 'transparent'; }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold flex items-center justify-center leading-none"
            style={{ background: 'var(--primary)', color: 'var(--text-on-primary)' }}
          >
            {badge}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          loadingMore={loadingMore}
          error={error}
          meta={meta}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDelete={deleteNotification}
          onLoadMore={loadMore}
          onClose={() => setIsOpen(false)}
          viewAllPath={viewAllPath}
        />
      )}
    </div>
  );
}
