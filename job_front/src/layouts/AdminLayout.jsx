import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, UserCheck,
  FileText, BookOpen, Settings, ClipboardList, ShieldCheck, Bell,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../components/layout/Sidebar';
import { Header  } from '../components/layout/Header';

export function AdminLayout() {
  const { t } = useTranslation();
  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);

  const NAV_ITEMS = [
    { type: 'label', key: 'main',    label: t('sidebar.admin.groupMain') },
    { to: '/admin/dashboard',        icon: LayoutDashboard, label: t('sidebar.admin.dashboard') },
    { type: 'label', key: 'mgmt',   label: t('sidebar.admin.groupManagement') },
    { to: '/admin/users',            icon: Users,           label: t('sidebar.admin.users') },
    { to: '/admin/company-requests', icon: ClipboardList,   label: t('sidebar.admin.companyRequests') },
    { to: '/admin/companies',        icon: Building2,       label: t('sidebar.admin.companies') },
    { to: '/admin/employees',        icon: ShieldCheck,     label: t('sidebar.admin.adminEmployees') },
    { type: 'label', key: 'content', label: t('sidebar.admin.groupContent') },
    { to: '/admin/cvs',              icon: FileText,        label: t('sidebar.admin.cvModeration') },
    { to: '/admin/courses',          icon: BookOpen,        label: t('sidebar.admin.courses') },
    { to: '/admin/notifications',      icon: Bell,            label: 'Notifications' },
    { type: 'divider', key: 'div1' },
    { to: '/admin/settings',         icon: Settings,        label: t('sidebar.admin.settings') },
  ];

  useEffect(() => {
    const w = collapsed ? '64px' : '240px';
    document.documentElement.style.setProperty('--sidebar-width', w);
    return () => document.documentElement.style.removeProperty('--sidebar-width');
  }, [collapsed]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'var(--bg-overlay)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 lg:relative lg:flex
          ${mobileOpen ? 'flex' : 'hidden lg:flex'}
        `}
      >
        <Sidebar
          items={NAV_ITEMS}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMobileMenuToggle={() => setMobileOpen((v) => !v)}
          settingsPath="/admin/settings"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
