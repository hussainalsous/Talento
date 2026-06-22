import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Sidebar({ items, collapsed, onToggle, logo }) {
  const { t } = useTranslation();
  return (
    <aside
      className="sidebar-el flex flex-col h-full transition-all duration-300"
      style={{
        width: collapsed ? 64 : 240,
        minWidth: collapsed ? 64 : 240,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 h-16 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--primary)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          </svg>
        </div>
        {!collapsed && (
          <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            {t('sidebar.brand')}
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((item) => {
          if (item.type === 'divider') {
            return (
              <div key={item.key} className="divider" style={{ margin: '8px 0' }} />
            );
          }
          if (item.type === 'label' && !collapsed) {
            return (
              <p
                key={item.key}
                className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {item.label}
              </p>
            );
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                clsx('sidebar-nav-item', isActive && 'active')
              }
              style={collapsed ? { justifyContent: 'center', padding: '9px' } : {}}
            >
              {Icon && <Icon size={18} />}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div
        className="flex items-center justify-center p-3"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
      >
        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
