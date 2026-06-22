import { createContext, useContext } from 'react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationCtx = createContext(null);

export function NotificationProvider({ children }) {
  const value = useNotifications();
  return (
    <NotificationCtx.Provider value={value}>
      {children}
    </NotificationCtx.Provider>
  );
}

export function useNotificationContext() {
  const ctx = useContext(NotificationCtx);
  if (!ctx) throw new Error('useNotificationContext must be used inside NotificationProvider');
  return ctx;
}
