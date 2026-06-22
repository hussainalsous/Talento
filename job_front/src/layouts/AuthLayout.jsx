import { Outlet } from 'react-router-dom';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export function AuthLayout() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-page)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 absolute top-0 right-0">
        <ThemeToggle />
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          {/* Brand */}
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--primary)', boxShadow: '0 4px 14px rgba(5,97,27,0.35)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              JobPortal
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Admin & Company Dashboard
            </p>
          </div>

          {/* Page content (Login / ForgotPassword) */}
          <div className="card p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
