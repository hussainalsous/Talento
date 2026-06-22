import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, Briefcase, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { companyApi } from '../../api/companyApi';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { formatDate, formatDateTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

export function CompanyApplicationDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const app = location.state?.application;

  const APPLICATION_STATUSES = [
    { value: 'under_review', label: t('companyApplicants.statusUnderReview') },
    { value: 'shortlisted',  label: t('companyApplicants.statusShortlisted') },
    { value: 'accepted',     label: t('companyApplicants.statusAccepted')    },
    { value: 'rejected',     label: t('companyApplicants.statusRejected')    },
  ];

  const [newStatus, setNewStatus] = useState(app?.status || '');
  const [updating,  setUpdating]  = useState(false);

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === app?.status) return;
    setUpdating(true);
    try {
      await companyApi.updateApplicationStatus(id, { status: newStatus });
      toast.success(t('companyApplicationDetail.statusUpdated'));
      navigate(-1);
    } catch (e) { toast.error(e?.message || t('errors.generic.title')); }
    finally { setUpdating(false); }
  };

  if (!app) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title={t('companyApplicationDetail.title')}
          breadcrumbs={[{ label: t('companyDashboard.breadCompany') }, { label: t('companyApplicationDetail.breadApplicants'), href: '/company/applicants' }]}
          actions={
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate('/company/applicants')}>
              {t('common.back')}
            </Button>
          }
        />
        <div className="card p-10 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('companyApplicationDetail.noDataMessage')}
          </p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/company/applicants')}>
            {t('companyApplicationDetail.goToApplicants')}
          </Button>
        </div>
      </div>
    );
  }

  const candidateName = app.candidate?.full_name || app.candidate?.name || '—';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('companyApplicationDetail.title')}
        breadcrumbs={[{ label: t('companyDashboard.breadCompany') }, { label: t('companyApplicationDetail.breadApplicants'), href: '/company/applicants' }, { label: candidateName }]}
        actions={
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate(-1)}>
            {t('common.back')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 flex flex-col items-center text-center gap-3">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
          >
            {candidateName[0]?.toUpperCase() || '?'}
          </div>
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>{candidateName}</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{app.candidate?.email}</p>
          <Badge status={app.status}>{app.status?.replace(/_/g, ' ')}</Badge>

          <div className="w-full pt-3 space-y-2" style={{ borderTop: '1px solid var(--border-default)' }}>
            <p className="text-xs font-semibold text-left" style={{ color: 'var(--text-muted)' }}>{t('companyApplicationDetail.updateStatus')}</p>
            <Select
              options={APPLICATION_STATUSES}
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            />
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={handleStatusUpdate}
              loading={updating}
              disabled={!newStatus || newStatus === app.status}
            >
              {t('companyApplicationDetail.saveStatus')}
            </Button>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2 space-y-4">
          <div>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('companyApplicationDetail.applicationInfo')}</h3>
            <div className="space-y-3">
              <InfoRow icon={Briefcase} label={t('companyApplicationDetail.labelAppliedFor')} value={app.job_post?.title} />
              <InfoRow icon={User}      label={t('companyApplicationDetail.labelCandidate')}  value={candidateName} />
              <InfoRow icon={Calendar}  label={t('companyApplicationDetail.labelAppliedAt')}  value={formatDateTime(app.created_at)} />
              {app.score !== null && app.score !== undefined && (
                <InfoRow icon={Briefcase} label={t('companyApplicationDetail.labelScore')} value={String(app.score)} />
              )}
            </div>
          </div>

          {app.cover_letter && (
            <div>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('companyApplicationDetail.coverLetter')}</h3>
              <div
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}
              >
                <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                  {app.cover_letter}
                </p>
              </div>
            </div>
          )}

          {app.candidate?.primary_cv?.file_url && (
            <div>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('companyApplicationDetail.cvResume')}</h3>
              <a href={app.candidate.primary_cv.file_url} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm">{t('companyApplicationDetail.downloadCV')}</Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid var(--border-default)' }}>
      <Icon size={16} style={{ color: 'var(--text-muted)', marginTop: 2 }} />
      <div>
        <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value || '—'}</p>
      </div>
    </div>
  );
}
