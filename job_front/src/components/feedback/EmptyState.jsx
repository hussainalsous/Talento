import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('emptyState.title');
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--bg-hover)' }}
      >
        <Icon size={28} style={{ color: 'var(--text-muted)' }} />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {resolvedTitle}
      </h3>
      {description && (
        <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
