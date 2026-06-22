import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../app/useAuthStore';

export function UnauthorizedPage() {
  const { t } = useTranslation();
  const navigate   = useNavigate();
  const { isAuthenticated, getRole } = useAuthStore();

  const goHome = () => {
    if (!isAuthenticated) { navigate('/'); return; }
    const role = getRole();
    navigate(role === 'admin' || role === 'super_admin' ? '/admin/dashboard' : '/company/dashboard');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ background: 'var(--bg-page)' }}
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: 'var(--status-rejected-bg)' }}
      >
        <ShieldOff size={36} style={{ color: 'var(--clr-danger-a10)' }} />
      </div>
      <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>403</h1>
      <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('errors.unauthorized.title')}</h2>
      <p className="text-sm max-w-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        {t('errors.unauthorized.description')}
      </p>
      <Button variant="primary" onClick={goHome}>{t('errors.unauthorized.goToDashboard')}</Button>
    </div>
  );
}
