import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../app/useAuthStore';

/**
 * Shared hook for "resend verification email" button logic.
 * Handles loading, success, 429 throttle, 401 forced logout, and 60s cooldown.
 *
 * status: 'idle' | 'loading' | 'sent' | 'throttled' | 'error'
 * countdown: seconds remaining in cooldown (0 when not counting)
 */
export function useResendVerification() {
  const { logout } = useAuthStore();
  const [status, setStatus] = useState('idle');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const resend = useCallback(async () => {
    if (status === 'loading' || countdown > 0) return;
    setStatus('loading');
    try {
      await authApi.resendVerification();
      setStatus('sent');
      setCountdown(60);
    } catch (err) {
      if (err?.status === 429) {
        setStatus('throttled');
      } else if (err?.status === 401) {
        logout();
      } else {
        setStatus('error');
      }
    }
  }, [status, countdown, logout]);

  return { resend, status, countdown };
}
