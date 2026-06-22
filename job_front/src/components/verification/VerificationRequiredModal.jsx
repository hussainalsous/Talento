import { useState } from 'react';
import { ShieldAlert, Loader2, CheckCircle, X } from 'lucide-react';
import { authApi } from '../../api/authApi';

/**
 * Modal shown when a verified-gated API call returns 403 with email_verified: false.
 *
 * Usage:
 *   const [gateError, setGateError] = useState(null);
 *   // in catch: if (err.status === 403 && err.data?.email_verified === false) setGateError(err);
 *   <VerificationRequiredModal action="apply for jobs" open={!!gateError} onClose={() => setGateError(null)} />
 */
export function VerificationRequiredModal({ open, onClose, action = 'perform this action' }) {
  const [status, setStatus] = useState('idle');
  const [countdown, setCountdown] = useState(0);

  if (!open) return null;

  const handleResend = async () => {
    if (status === 'loading' || countdown > 0) return;
    setStatus('loading');
    try {
      await authApi.resendVerification();
      setStatus('sent');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      setStatus(err?.status === 429 ? 'throttled' : 'error');
    }
  };

  const isDisabled = status === 'loading' || status === 'throttled' || (status === 'sent' && countdown > 0);

  const buttonLabel = () => {
    if (status === 'loading') return null;
    if (status === 'sent') return countdown > 0 ? `Resend in ${countdown}s…` : 'Sent! Check your inbox.';
    if (status === 'throttled') return 'Please wait before trying again.';
    return 'Resend Verification Email';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0,0,0,0.45)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '32px 28px',
        maxWidth: '440px',
        width: '100%',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9ca3af', padding: 4,
          }}
        >
          <X size={18} />
        </button>

        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: '#fef3c7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '16px',
        }}>
          <ShieldAlert size={24} color="#d97706" />
        </div>

        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          Email Verification Required
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>
          Your email is not verified. Please check your inbox for the verification link
          before you can <strong>{action}</strong>.
        </p>

        <button
          type="button"
          onClick={handleResend}
          disabled={isDisabled}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            width: '100%',
            padding: '11px 20px', borderRadius: '9px',
            background: isDisabled ? '#d1fae5' : '#16a34a',
            color: isDisabled ? '#16a34a' : '#fff',
            border: 'none', cursor: isDisabled ? 'default' : 'pointer',
            fontWeight: 700, fontSize: '0.875rem',
          }}
        >
          {status === 'loading' && <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />}
          {status === 'sent' && countdown === 0 && <CheckCircle size={15} />}
          {buttonLabel()}
        </button>

        {status === 'throttled' && (
          <p style={{ marginTop: '8px', color: '#92400e', fontSize: '0.8rem', textAlign: 'center' }}>
            Please wait a moment before requesting another link.
          </p>
        )}
        {status === 'error' && (
          <p style={{ marginTop: '8px', color: '#dc2626', fontSize: '0.8rem', textAlign: 'center' }}>
            Something went wrong. Please try again.
          </p>
        )}
        {status === 'sent' && (
          <p style={{ marginTop: '8px', color: '#15803d', fontSize: '0.8rem', textAlign: 'center' }}>
            A new verification link has been sent to your inbox.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Checks whether a caught API error is a verification-gate 403.
 */
export function isVerificationGateError(err) {
  return err?.status === 403 && err?.data?.email_verified === false;
}
