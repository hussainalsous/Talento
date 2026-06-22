import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationApi } from '../api/notificationApi';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../app/useAuthStore';

export function useNotifications() {
  const user   = useAuthStore((s) => s.user);
  const userId = user?.id != null ? String(user.id) : null;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [error,         setError]         = useState(null);
  const [meta,          setMeta]          = useState({ current_page: 1, last_page: 1, total: 0, per_page: 20 });
  const [isLoaded,      setIsLoaded]      = useState(false);

  // Ref to read current notifications in delete handler without stale closure
  const notificationsRef = useRef(notifications);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  // Guards against concurrent in-flight calls (React StrictMode double-invoke in dev)
  const fetchingRef = useRef(false);

  // Wipe all notification state whenever the authenticated user changes.
  // NotificationProvider is mounted for the full app lifetime and never remounts,
  // so without this reset User A's notifications remain visible to User B after an
  // account switch. Must be declared BEFORE the bootstrap effect so it fires first.
  useEffect(() => {
    console.log('[NOTIF] userId changed →', userId, '— resetting notification state');
    setNotifications([]);
    setUnreadCount(0);
    setIsLoaded(false);
    setError(null);
    setMeta({ current_page: 1, last_page: 1, total: 0, per_page: 20 });
    fetchingRef.current = false;
  }, [userId]);

  // Bootstrap: load unread badge count once per user
  useEffect(() => {
    if (!userId) return;
    console.log('[NOTIF] fetching unread count for userId:', userId);
    notificationApi.getUnreadCount()
      .then((res) => {
        const count = res.data?.data?.unread_count;
        console.log('[NOTIF] unread count bootstrap →', count);
        if (typeof count === 'number') setUnreadCount(count);
      })
      .catch(() => {});
  }, [userId]);

  // Supabase realtime: prepend new INSERTs and increment badge
  useEffect(() => {
    if (!userId || !supabase) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const raw = payload.new;
          if (!raw?.id) return;
          console.log('[NOTIF] realtime INSERT — subscriber userId:', userId, 'notification user_id:', raw.user_id, 'id:', raw.id);
          // Normalise: Supabase may send JSONB `data` as a string in some versions,
          // and `is_read` may arrive as 't'/'f' depending on the pg driver.
          const incoming = {
            ...raw,
            data:    typeof raw.data === 'string' ? (JSON.parse(raw.data) || {}) : (raw.data ?? {}),
            is_read: raw.is_read === true || raw.is_read === 1 || raw.is_read === 't',
          };
          setNotifications((prev) => {
            if (prev.some((n) => n.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const loadNotifications = useCallback(async (page = 1) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (page === 1) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }
    try {
      const res      = await notificationApi.getNotifications(page);
      const { data, meta: m } = res.data;
      console.log(
        '[NOTIF] notifications loaded — userId:', userId,
        'count:', data?.length,
        'ids:', (data ?? []).map((n) => n.id),
        'user_ids in payload:', [...new Set((data ?? []).map((n) => n.user_id))],
      );
      setMeta(m);
      if (typeof m?.unread_count === 'number') setUnreadCount(m.unread_count);
      if (page === 1) {
        setNotifications(data ?? []);
      } else {
        setNotifications((prev) => {
          const ids = new Set(prev.map((n) => n.id));
          return [...prev, ...(data ?? []).filter((n) => !ids.has(n.id))];
        });
      }
      setIsLoaded(true);
    } catch (err) {
      if (page === 1) setError(err?.message || 'Failed to load notifications.');
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (meta.current_page < meta.last_page && !loadingMore) {
      loadNotifications(meta.current_page + 1);
    }
  }, [meta, loadingMore, loadNotifications]);

  const markAsRead = useCallback(async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (_) {}
  }, []);

  const deleteNotification = useCallback(async (id) => {
    const target = notificationsRef.current.find((n) => n.id === id);
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.is_read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (_) {}
  }, []);

  const refresh = useCallback(() => loadNotifications(1), [loadNotifications]);

  return {
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
  };
}
