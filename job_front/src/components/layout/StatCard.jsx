import { TrendingUp, TrendingDown } from 'lucide-react';

export function StatCard({ label, value, icon: Icon, trend, trendLabel, color, loading }) {
  const iconBg   = color?.bg   || 'var(--primary-light)';
  const iconClr  = color?.icon || 'var(--primary)';

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </p>
          {loading ? (
            <div className="skeleton h-8 w-24 rounded" />
          ) : (
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {value ?? '—'}
            </p>
          )}
          {trendLabel && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend === 'up'   && <TrendingUp  size={14} style={{ color: 'var(--clr-success-a0)' }} />}
              {trend === 'down' && <TrendingDown size={14} style={{ color: 'var(--clr-danger-a10)' }} />}
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{trendLabel}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-4"
            style={{ background: iconBg }}
          >
            <Icon size={22} style={{ color: iconClr }} />
          </div>
        )}
      </div>
    </div>
  );
}
