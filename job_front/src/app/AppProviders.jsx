import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useAuthStore } from './useAuthStore';
import { useThemeStore } from './useThemeStore';
import { NotificationProvider } from '../contexts/NotificationContext';

export function AppProviders({ children }) {
  const fetchMe    = useAuthStore((s) => s.fetchMe);
  const logout     = useAuthStore((s) => s.logout);
  const isDark     = useThemeStore((s) => s.isDark);

  /* Restore auth session on mount */
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  /* Listen for global auth events from the axios interceptor */
  useEffect(() => {
    const handleLogout = () => { console.log('[AUTH] auth:logout event received'); logout(); };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [logout]);

  useEffect(() => {
    const handleForbidden = () =>
      toast.error('You do not have permission to perform this action.');
    window.addEventListener('auth:forbidden', handleForbidden);
    return () => window.removeEventListener('auth:forbidden', handleForbidden);
  }, []);

  return (
    <>
      <NotificationProvider>
        {children}
      </NotificationProvider>
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: isDark() ? 'var(--bg-card)' : '#fff',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: '10px',
            fontSize: '14px',
            boxShadow: 'var(--shadow-md)',
          },
          success: {
            iconTheme: { primary: 'var(--clr-success-a0)', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: 'var(--clr-danger-a10)', secondary: '#fff' },
          },
        }}
      />
    </>
  );

}
