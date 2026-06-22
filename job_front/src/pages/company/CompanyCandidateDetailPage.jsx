import { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Briefcase, FileText, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { companyApi } from '../../api/companyApi';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/feedback/ErrorState';
import toast from 'react-hot-toast';

export function CompanyCandidateDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [requesting, setRequesting] = useState(false);

  const fetchFn = useCallback(() => companyApi.getCandidate(id), [id]);
  const { data, loading, error, refetch } = useFetch(fetchFn);
  const candidate = data?.data ?? data;

  const handleRequestCV = async () => {
    setRequesting(true);
    try {
      await companyApi.requestCvAccess(id);
      toast.success(t('companyCandidates.cvAccessSent'));
    } catch (e) { toast.error(e?.message || t('errors.generic.title')); }
    finally { setRequesting(false); }
  };

  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (loading || !candidate) return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
    </div>
  );

  const name    = candidate.full_name || '—';
  const cvUrl   = candidate.primary_cv?.file_url;
  const isPublicCV = candidate.cv_visibility === 'public' && cvUrl;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('companyCandidateDetail.title')}
        breadcrumbs={[{ label: t('companyDashboard.breadCompany') }, { label: t('companyCandidateDetail.breadCandidates'), href: '/company/candidates' }, { label: name }]}
        actions={
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate('/company/candidates')}>
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
            {name[0]?.toUpperCase() || '?'}
          </div>
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>{name}</h2>
          {candidate.location && (
            <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <MapPin size={12} /> {candidate.location}
            </p>
          )}
          <div className="flex gap-2 w-full mt-2">
            {isPublicCV
              ? (
                <a href={cvUrl} target="_blank" rel="noreferrer" className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full" leftIcon={<FileText size={14} />}>
                    {t('companyCandidates.viewCV')}
                  </Button>
                </a>
              )
              : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  leftIcon={<FileText size={14} />}
                  loading={requesting}
                  onClick={handleRequestCV}
                >
                  {t('companyCandidates.requestCV')}
                </Button>
              )
            }
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              leftIcon={<Send size={14} />}
              onClick={() => navigate('/company/invitations', { state: { candidateId: id } })}
            >
              {t('companyCandidateDetail.inviteButton')}
            </Button>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2 space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('companyCandidateDetail.title')}</h3>

          {candidate.bio && (
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Bio</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{candidate.bio}</p>
            </div>
          )}

          {candidate.preferred_job_type && (
            <div className="flex items-center gap-2">
              <Briefcase size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Preferred: {candidate.preferred_job_type.replace(/_/g, ' ')}
              </span>
            </div>
          )}

          {candidate.skills?.length > 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Skills</p>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!candidate.bio && !candidate.preferred_job_type && !candidate.skills?.length && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No additional profile information available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
