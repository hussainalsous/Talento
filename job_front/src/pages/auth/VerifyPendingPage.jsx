import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../app/useAuthStore';
import { authApi } from '../../api/authApi';
import { useResendVerification } from '../../hooks/useResendVerification';

function TalentoMark() {
  return (
    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: 'linear-gradient(135deg,#16a34a 0%,#22c55e 100%)',
        boxShadow: '0 4px 18px rgba(22,163,74,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 12px',
      }}>
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3.5 5.5h13M10 5.5v9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.04em', color: '#16a34a' }}>
        Talento
      </span>
    </div>
  );
}

function CheckedAlready({ onVerified }) {
  const { updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);

  const handleCheck = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login', { state: { message: 'Please log in to check your verification status.' } });
      return;
    }
    setChecking(true);
    setNotYet(false);
    try {
      const res = await authApi.me();
      const user = res.data?.data ?? res.data;
      updateUser(user);
      if (user?.email_verified_at) {
        onVerified?.();
      } else {
        setNotYet(true);
      }
    } catch {
      setNotYet(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ marginTop: '16px', textAlign: 'center' }}>
      <button
        type="button"
        onClick={handleCheck}
        disabled={checking}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#16a34a', fontWeight: 600, fontSize: '0.875rem',
          textDecoration: 'underline', padding: 0,
        }}
      >
        {checking ? 'Checking…' : "I've already clicked the link →"}
      </button>
      {notYet && (
        <p style={{ marginTop: '6px', color: '#92400e', fontSize: '0.8rem' }}>
          Not verified yet. Please check your inbox.
        </p>
      )}
    </div>
  );
}

export function VerifyPendingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { resend, status, countdown } = useResendVerification();

  const handleResend = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login', { state: { message: 'Please log in to request a new verification link.' } });
      return;
    }
    await resend();
  };

  const buttonLabel = () => {
    if (status === 'loading') return null;
    if (status === 'sent') return countdown > 0 ? `Resend in ${countdown}s…` : 'Sent! Check your inbox.';
    if (status === 'throttled') return 'Please wait before requesting another link.';
    return 'Resend Email';
  };

  const isDisabled = status === 'loading' || status === 'throttled' || (status === 'sent' && countdown > 0);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '40px 36px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
      }}>
        <TalentoMark />

        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: '#dcfce7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Mail size={28} color="#16a34a" />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>
          Check Your Inbox
        </h1>
        <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: '28px' }}>
          We sent a verification link to{' '}
          <strong style={{ color: '#111827' }}>{user?.email || 'your email address'}</strong>.
          Click the link in the email to activate your account. The link expires in 60 minutes.
        </p>

        <button
          type="button"
          onClick={handleResend}
          disabled={isDisabled}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            width: '100%',
            padding: '12px 24px', borderRadius: '10px',
            background: isDisabled ? '#d1fae5' : '#16a34a',
            color: isDisabled ? '#16a34a' : '#fff',
            border: 'none', cursor: isDisabled ? 'default' : 'pointer',
            fontWeight: 700, fontSize: '0.925rem',
            transition: 'background 0.2s',
          }}
        >
          {status === 'loading' && <Loader2 size={16} className="animate-spin-slow" />}
          {status === 'sent' && countdown === 0 && <CheckCircle size={16} />}
          {buttonLabel()}
        </button>

        {status === 'error' && (
          <p style={{ marginTop: '10px', color: '#dc2626', fontSize: '0.85rem' }}>
            Something went wrong. Please try again.
          </p>
        )}

        <CheckedAlready onVerified={() => navigate('/job-seeker/profile', { replace: true })} />
      </div>
    </div>
  );
}
