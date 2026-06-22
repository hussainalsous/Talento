import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

export function ErrorState({ message, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--status-rejected-bg)' }}
      >
        <AlertCircle size={28} style={{ color: 'var(--clr-danger-a10)' }} />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {t('errors.generic.title')}
      </h3>
      <p className="text-sm max-w-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        {message || t('errors.generic.description')}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('errors.generic.retry')}
        </Button>
      )}
    </div>
  );
}
