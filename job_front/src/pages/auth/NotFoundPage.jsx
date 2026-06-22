import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ background: 'var(--bg-page)' }}
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: 'var(--bg-hover)' }}
      >
        <Search size={36} style={{ color: 'var(--text-muted)' }} />
      </div>
      <h1 className="text-6xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>404</h1>
      <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('errors.notFound.title')}</h2>
      <p className="text-sm max-w-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        {t('errors.notFound.description')}
      </p>
      <Button variant="primary" onClick={() => navigate(-1)}>{t('errors.notFound.goBack')}</Button>
    </div>
  );
}
