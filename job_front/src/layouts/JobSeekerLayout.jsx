import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { User, BellRing, Sparkles } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header  } from '../components/layout/Header';
import { VerificationBanner } from '../components/verification/VerificationBanner';

const NAV_ITEMS = [
  { type: 'label', key: 'main',     label: 'My Profile' },
  { to: '/job-seeker/profile',       icon: User,      label: 'Profile' },
  { type: 'label', key: 'activity', label: 'Activity' },
  { to: '/job-seeker/matches',       icon: Sparkles,  label: 'Matches' },
  { to: '/job-seeker/notifications', icon: BellRing,  label: 'Notifications' },
];

export function JobSeekerLayout() {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const w = collapsed ? '64px' : '240px';
    document.documentElement.style.setProperty('--sidebar-width', w);
    return () => document.documentElement.style.removeProperty('--sidebar-width');
  }, [collapsed]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'var(--bg-overlay)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-40 lg:relative lg:flex ${mobileOpen ? 'flex' : 'hidden lg:flex'}`}>
        <Sidebar
          items={NAV_ITEMS}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMobileMenuToggle={() => setMobileOpen((v) => !v)}
          settingsPath="/job-seeker/profile"
        />
        <VerificationBanner />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
