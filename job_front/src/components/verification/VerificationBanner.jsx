import { useState } from 'react';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../app/useAuthStore';
import { authApi } from '../../api/authApi';
import { useResendVerification } from '../../hooks/useResendVerification';

function CheckedLink() {
  const { updateUser } = useAuthStore();
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    setNotYet(false);
    try {
      const res = await authApi.me();
      const user = res.data?.data ?? res.data;
      updateUser(user);
      if (!user?.email_verified_at) setNotYet(true);
      // if verified, updateUser causes re-render and banner disappears
    } catch {
      setNotYet(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <span className="flex items-center gap-1 flex-wrap">
      <button
        type="button"
        onClick={handleCheck}
        disabled={checking}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--primary)', fontWeight: 600, fontSize: '0.8rem',
          padding: 0, textDecoration: 'underline',
        }}
      >
        {checking ? "Checking…" : "I've already clicked the link →"}
      </button>
      {notYet && (
        <span style={{ color: 'var(--clr-warning-a0, #a87a2a)', fontSize: '0.8rem' }}>
          Not verified yet. Please check your inbox.
        </span>
      )}
    </span>
  );
}

export function VerificationBanner() {
  const { user } = useAuthStore();
  const { resend, status, countdown } = useResendVerification();

  const needsBanner =
    user &&
    user.email_verified_at === null &&
    (user.role === 'job_seeker' || user.role === 'company_owner');

  if (!needsBanner) return null;

  const buttonLabel = () => {
    if (status === 'loading') return null;
    if (status === 'sent') return countdown > 0 ? `Resend in ${countdown}s…` : 'Sent! Check your inbox.';
    if (status === 'throttled') return 'Please wait before requesting another link.';
    return 'Resend Email';
  };

  const isDisabled = status === 'loading' || status === 'throttled' || (status === 'sent' && countdown > 0);

  return (
    <div
      role="alert"
      style={{
        background: '#fefce8',
        borderBottom: '1px solid #fde68a',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '0.875rem',
        color: '#92400e',
      }}
    >
      <Mail size={15} style={{ flexShrink: 0 }} />
      <span>
        Please verify your email address. We sent a link to{' '}
        <strong>{user.email}</strong>.
      </span>

      <button
        type="button"
        onClick={resend}
        disabled={isDisabled}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: '#d97706', color: '#fff',
          border: 'none', borderRadius: '6px',
          padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600,
          cursor: isDisabled ? 'default' : 'pointer',
          opacity: isDisabled ? 0.7 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {status === 'loading' && <Loader2 size={13} className="animate-spin-slow" />}
        {status === 'sent' && countdown === 0 && <CheckCircle size={13} />}
        {buttonLabel()}
      </button>

      {status === 'error' && (
        <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>
          Something went wrong. Please try again.
        </span>
      )}

      <span style={{ color: '#78350f', fontSize: '0.75rem' }}>·</span>
      <CheckedLink />
    </div>
  );
}
