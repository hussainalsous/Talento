import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Building2, User, Hash, Calendar, Globe, MapPin, Mail, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/adminApi';
import { useFetch } from '../../hooks/useFetch';
import { useForm } from '../../hooks/useForm';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { ErrorState } from '../../components/feedback/ErrorState';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

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

export function AdminCompanyRequestDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [rejectModal,   setRejectModal]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFn = useCallback(() => adminApi.getCompanyRequest(id), [id]);
  const { data, loading, error, refetch } = useFetch(fetchFn);

  const req = data?.data ?? data;

  const { values, handleChange, isValid, errors, reset } = useForm(
    { rejection_reason: '' },
    (v) => (!v.rejection_reason ? { rejection_reason: t('adminCompanyRequests.reasonRequired') } : {}),
  );

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await adminApi.approveCompanyRequest(id);
      toast.success(t('adminCompanyRequestDetail.approvedToast'));
      refetch();
    } catch (e) { toast.error(e?.message || t('errors.generic.title')); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!isValid()) return;
    setActionLoading(true);
    try {
      await adminApi.rejectCompanyRequest(id, values.rejection_reason);
      toast.success(t('adminCompanyRequestDetail.rejectedToast'));
      setRejectModal(false);
      reset();
      refetch();
    } catch (e) { toast.error(e?.message || t('errors.generic.title')); }
    finally { setActionLoading(false); }
  };

  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (loading || !req) return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
    </div>
  );

  const requesterName = `${req.requester_first_name || ''} ${req.requester_last_name || ''}`.trim();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('adminCompanyRequestDetail.title')}
        breadcrumbs={[
          { label: t('adminDashboard.breadAdmin') },
          { label: t('adminCompanyRequestDetail.breadRequests'), href: '/admin/company-requests' },
          { label: req.company_name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate('/admin/company-requests')}>
              {t('common.back')}
            </Button>
            {req.status === 'pending' && (
              <>
                <Button variant="primary" size="sm" leftIcon={<CheckCircle size={15} />} onClick={handleApprove} loading={actionLoading}>
                  {t('adminCompanyRequestDetail.approveButton')}
                </Button>
                <Button variant="danger" size="sm" leftIcon={<XCircle size={15} />} onClick={() => setRejectModal(true)}>
                  {t('adminCompanyRequestDetail.rejectButton')}
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 flex flex-col items-center text-center gap-3">
          {req.logo_url
            ? <img src={req.logo_url} alt={req.company_name} className="w-20 h-20 rounded-2xl object-cover" />
            : <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--primary-light)' }}>
                <Building2 size={28} style={{ color: 'var(--primary)' }} />
              </div>
          }
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>{req.company_name}</h2>
          <Badge status={req.status}>{req.status}</Badge>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('adminCompanyRequestDetail.companyInfo')}</h3>
          <DetailRow icon={Building2} label={t('adminCompanyRequestDetail.labelCompanyName')}  value={req.company_name} />
          <DetailRow icon={Hash}      label={t('adminCompanyRequestDetail.labelRegNumber')}    value={req.registration_number} />
          <DetailRow icon={Globe}     label={t('adminCompanyRequestDetail.labelWebsite')}      value={req.website} />
          <DetailRow icon={MapPin}    label={t('adminCompanyRequestDetail.labelAddress')}      value={req.address} />
          <DetailRow icon={MapPin}    label={t('adminCompanyRequestDetail.labelCountry')}      value={req.country} />
          <DetailRow icon={Calendar}  label={t('adminCompanyRequestDetail.labelSubmittedAt')}  value={formatDate(req.created_at)} />

          <div className="mt-4">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('adminCompanyRequestDetail.requesterContact')}</h3>
            <DetailRow icon={User}  label={t('adminCompanyRequestDetail.labelFullName')} value={requesterName} />
            <DetailRow icon={Mail}  label={t('adminCompanyRequestDetail.labelEmail')}    value={req.requester_email} />
            <DetailRow icon={Phone} label={t('adminCompanyRequestDetail.labelPhone')}    value={req.requester_phone} />
          </div>

          {req.rejection_reason && (
            <div className="mt-4 p-3 rounded-xl" style={{ background: 'var(--status-rejected-bg)', border: '1px solid var(--clr-danger-a20)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--clr-danger-a10)' }}>{t('adminCompanyRequestDetail.rejectionReason')}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{req.rejection_reason}</p>
            </div>
          )}

          {req.description && (
            <div className="mt-4">
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{t('adminCompanyRequestDetail.companyDescription')}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{req.description}</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={rejectModal}
        onClose={() => { setRejectModal(false); reset(); }}
        title={t('adminCompanyRequestDetail.rejectModalTitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRejectModal(false); reset(); }} disabled={actionLoading}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleReject} loading={actionLoading}>
              {t('adminCompanyRequestDetail.confirmRejection')}
            </Button>
          </>
        }
      >
        <Textarea
          label={t('adminCompanyRequestDetail.rejectReason')}
          name="rejection_reason"
          value={values.rejection_reason}
          onChange={handleChange}
          error={errors.rejection_reason}
          rows={3}
          required
          placeholder={t('adminCompanyRequestDetail.rejectReasonPlaceholder')}
        />
      </Modal>
    </div>
  );
}
