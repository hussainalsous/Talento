import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Calendar, Shield, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/adminApi';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/feedback/ErrorState';
import { formatDate, humanizeRole } from '../../utils/formatters';
import { getUserDisplayName } from '../../app/useAuthStore';

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
      <Icon size={16} style={{ color: 'var(--text-muted)', marginTop: 2 }} />
      <div>
        <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value || '—'}</p>
      </div>
    </div>
  );
}

export function AdminUserDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const fetchFn = useCallback(() => adminApi.getUser(id), [id]);
  const { data, loading, error, refetch } = useFetch(fetchFn);

  // Response: { success, data: UserResource }
  const user = data?.data ?? data;
  const displayName = getUserDisplayName(user);

  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (loading) return (
    <div className="space-y-6">
      <div className="skeleton h-8 w-48 rounded" />
      <div className="card p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('adminUserDetail.title')}
        breadcrumbs={[{ label: t('adminDashboard.breadAdmin') }, { label: t('adminUserDetail.breadUsers'), href: '/admin/users' }, { label: displayName || user?.email }]}
        actions={
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate('/admin/users')}>
            {t('common.back')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="card p-6 flex flex-col items-center text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold mb-3"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
          >
            {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{displayName}</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
          <Badge status={user?.is_active ? 'active' : 'inactive'}>
            {user?.is_active ? t('common.active') : t('common.inactive')}
          </Badge>
        </div>

        {/* Details */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('adminUserDetail.accountInfo')}</h3>
          <InfoRow icon={Mail}     label={t('adminUserDetail.labelEmail')}     value={user?.email} />
          <InfoRow icon={Phone}    label={t('adminUserDetail.labelPhone')}     value={user?.phone} />
          <InfoRow icon={Shield}   label={t('adminUserDetail.labelRole')}      value={humanizeRole(user?.role)} />
          <InfoRow icon={Calendar} label={t('adminUserDetail.labelJoined')}    value={formatDate(user?.created_at)} />
          <InfoRow icon={Calendar} label={t('adminUserDetail.labelLastLogin')} value={formatDate(user?.last_login_at)} />

          {user?.company_member && (
            <InfoRow icon={Shield} label={t('adminUserDetail.labelCompanyRole')} value={user.company_member.role_in_company || humanizeRole(user.role)} />
          )}
          {user?.company_member?.company && (
            <InfoRow icon={Shield} label={t('adminUserDetail.labelCompany')} value={user.company_member.company?.name} />
          )}
        </div>
      </div>
    </div>
  );
}
