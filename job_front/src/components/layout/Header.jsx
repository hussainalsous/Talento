import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Settings, User, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore, getUserDisplayName, getUserInitials } from '../../app/useAuthStore';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Avatar } from '../ui/Avatar';
import { NotificationBell } from '../notifications/NotificationBell';
import toast from 'react-hot-toast';

function getProfilePath(user) {
  const role = user?.role;
  if (role === 'admin' || role === 'super_admin') return '/admin/dashboard';
  if (role === 'job_seeker') return '/job-seeker/profile';
  return '/company/profile';
}

export function Header({ onMobileMenuToggle, settingsPath }) {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  const displayName = getUserDisplayName(user);
  const initials    = getUserInitials(user);
  const profilePath = getProfilePath(user);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setDropOpen(false);
    await logout();
    toast.success(t('auth.logout.success'));
    navigate('/');
  };

  return (
    <header
      className="flex items-center justify-between px-5 h-16 shrink-0"
      style={{
        background: 'var(--bg-header)',
        borderBottom: '1px solid var(--border-default)',
        zIndex: 10,
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Left: mobile menu toggle */}
      <button
        onClick={onMobileMenuToggle}
        className="p-2 rounded-lg lg:hidden"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Menu size={20} />
      </button>

      <div className="hidden lg:block" />

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <NotificationBell />

        <ThemeToggle />

        {/* User dropdown */}
        <div ref={dropRef} className="relative">
          <button
            onClick={() => setDropOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl transition-colors"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => { if (!dropOpen) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { if (!dropOpen) e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Show initials-based avatar (no image URL in current API) */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium leading-none" style={{ color: 'var(--text-primary)' }}>
                {displayName || t('common.user')}
              </p>
              <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
                {user?.role?.replace(/_/g, ' ')}
              </p>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {dropOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-xl py-1 animate-fade-in"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 50,
              }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {displayName}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
              </div>
              <DropItem icon={User}     label={t('nav.profile')}  onClick={() => { setDropOpen(false); navigate(profilePath); }} />
              <DropItem icon={Settings} label={t('nav.settings')} onClick={() => { setDropOpen(false); navigate(settingsPath || '/'); }} />
              <div className="divider my-1" />
              <DropItem icon={LogOut}   label={t('nav.logout')}   onClick={handleLogout} danger />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function DropItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
      style={{ color: danger ? 'var(--clr-danger-a10)' : 'var(--text-secondary)' }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
