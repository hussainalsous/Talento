import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Briefcase,
  UserSearch, Send, BookOpen, Settings, FileText, Bell,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../components/layout/Sidebar';
import { Header  } from '../components/layout/Header';
import { VerificationBanner } from '../components/verification/VerificationBanner';

export function CompanyLayout() {
  const { t } = useTranslation();
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV_ITEMS = [
    { type: 'label', key: 'main',  label: t('sidebar.company.groupOverview') },
    { to: '/company/dashboard',    icon: LayoutDashboard, label: t('sidebar.company.dashboard') },
    { type: 'label', key: 'mgmt', label: t('sidebar.company.groupCompany') },
    { to: '/company/profile',      icon: Building2,       label: t('sidebar.company.profile') },
    { to: '/company/members',      icon: Users,           label: t('sidebar.company.members') },
    { type: 'label', key: 'jobs', label: t('sidebar.company.groupRecruitment') },
    { to: '/company/job-posts',    icon: Briefcase,       label: t('sidebar.company.jobPosts') },
    { to: '/company/applicants',   icon: FileText,        label: t('sidebar.company.applicants') },
    { to: '/company/candidates',   icon: UserSearch,      label: t('sidebar.company.candidateSearch') },
    { to: '/company/invitations',  icon: Send,            label: t('sidebar.company.invitations') },
    { type: 'label', key: 'learn', label: t('sidebar.company.groupResources') },
    { to: '/company/courses',      icon: BookOpen,        label: t('sidebar.company.courses') },
    { to: '/company/notifications',  icon: Bell,            label: 'Notifications' },
    { type: 'divider', key: 'div1' },
    { to: '/company/settings',     icon: Settings,        label: t('sidebar.company.settings') },
  ];

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
          settingsPath="/company/settings"
        />
        <VerificationBanner />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
