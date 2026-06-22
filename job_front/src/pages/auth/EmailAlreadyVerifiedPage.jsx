import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

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

export function EmailAlreadyVerifiedPage() {
  const navigate = useNavigate();
  const hasToken = !!localStorage.getItem('auth_token');

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
          <CheckCircle size={30} color="#16a34a" />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>
          Already Verified
        </h1>
        <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: '28px' }}>
          Your email address is already verified. You can log in and use the platform.
        </p>

        <button
          type="button"
          onClick={() => navigate(hasToken ? '/job-seeker/profile' : '/login', { replace: true })}
          style={{
            width: '100%',
            padding: '12px 24px', borderRadius: '10px',
            background: '#16a34a', color: '#fff',
            border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.925rem',
          }}
        >
          {hasToken ? 'Go to Dashboard' : 'Go to Login'}
        </button>
      </div>
    </div>
  );
}
