import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Globe, MapPin, User, Mail, Phone, Hash, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/adminApi';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/feedback/ErrorState';
import { formatDate } from '../../utils/formatters';

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
      <Icon size={16} style={{ color: 'var(--text-muted)', marginTop: 2 }} />
      <div>
        <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

export function AdminCompanyDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const fetchFn = useCallback(() => adminApi.getCompanyRequest(id), [id]);
  const { data, loading, error, refetch } = useFetch(fetchFn);

  const req = data?.data ?? data;
  const requesterName = req ? `${req.requester_first_name || ''} ${req.requester_last_name || ''}`.trim() : '';

  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (loading || !req) return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('adminCompanyDetail.title')}
        breadcrumbs={[
          { label: t('adminDashboard.breadAdmin') },
          { label: t('adminCompanyDetail.breadCompanies'), href: '/admin/companies' },
          { label: req.company_name },
        ]}
        actions={
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate('/admin/companies')}>
            {t('common.back')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 flex flex-col items-center text-center gap-3">
          {req.logo_url
            ? <img src={req.logo_url} alt={req.company_name} className="w-20 h-20 rounded-2xl object-cover" />
            : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                {req.company_name?.[0]}
              </div>
            )
          }
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{req.company_name}</h2>
          <Badge status={req.status === 'approved' ? 'active' : req.status}>{req.status}</Badge>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('adminCompanyDetail.companyInfo')}</h3>
          <DetailRow icon={Building2} label={t('adminCompanyDetail.labelCompanyName')}     value={req.company_name} />
          <DetailRow icon={Hash}      label={t('adminCompanyDetail.labelRegNumber')}       value={req.registration_number} />
          <DetailRow icon={Globe}     label={t('adminCompanyDetail.labelWebsite')}         value={req.website} />
          <DetailRow icon={MapPin}    label={t('adminCompanyDetail.labelAddress')}         value={req.address} />
          <DetailRow icon={MapPin}    label={t('adminCompanyDetail.labelCountry')}         value={req.country} />
          <DetailRow icon={Calendar}  label={t('adminCompanyDetail.labelRegistrationDate')} value={formatDate(req.created_at)} />

          <div className="mt-4">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('adminCompanyDetail.ownerContact')}</h3>
            <DetailRow icon={User}  label={t('adminCompanyDetail.labelFullName')} value={requesterName} />
            <DetailRow icon={Mail}  label={t('adminCompanyDetail.labelEmail')}    value={req.requester_email} />
            <DetailRow icon={Phone} label={t('adminCompanyDetail.labelPhone')}    value={req.requester_phone} />
          </div>

          {req.description && (
            <div className="mt-4">
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t('adminCompanyDetail.descriptionLabel')}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{req.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
