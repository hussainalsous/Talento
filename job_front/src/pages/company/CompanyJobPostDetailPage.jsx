import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, MapPin, Clock, DollarSign, Users, Briefcase, BarChart2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { companyApi } from '../../api/companyApi';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/tables/DataTable';
import { ErrorState } from '../../components/feedback/ErrorState';
import { formatDate, extractPagination } from '../../utils/formatters';

const LEVEL_BADGE_STATUS = {
  'Fresh graduate': 'info',
  'Junior':         'success',
  'Mid-level':      'warning',
  'Senior':         'danger',
};

/** Normalise old string data or empty values to an array. */
function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function CompanyJobPostDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const postFn = useCallback(() => companyApi.getJobPost(id), [id]);
  const { data: postData, loading: postLoading, error: postError, refetch: refetchPost } = useFetch(postFn);
  const post = postData?.data ?? postData;

  const appFn = useCallback(() => companyApi.getJobPostApplicants(id), [id]);
  const { data: appData, loading: appLoading, error: appError } = useFetch(appFn);
  const { data: applicants } = extractPagination(appData);

  const responsibilities = toArray(post?.responsibilities);
  const requirements     = toArray(post?.requirements);

  const appColumns = [
    {
      key: 'candidate', label: t('companyJobPostDetail.applicants'),
      render: (v) => (
        <div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {v?.full_name || v?.name || '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{v?.email || ''}</p>
        </div>
      ),
    },
    { key: 'status',     label: t('companyApplicants.colStatus'),  render: (v) => <Badge status={v}>{v?.replace(/_/g, ' ')}</Badge> },
    { key: 'created_at', label: t('companyApplicants.colApplied'), render: (v) => formatDate(v) },
    {
      key: 'actions', label: '', width: 80, align: 'right',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/company/applicants/${row.id}`, { state: { application: row, jobPost: post } })}
        >
          {t('common.viewAll')}
        </Button>
      ),
    },
  ];

  if (postError) return <ErrorState message={postError} onRetry={refetchPost} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={postLoading ? '…' : (post?.title || 'Job Post')}
        breadcrumbs={[{ label: t('companyDashboard.breadCompany') }, { label: t('companyJobPostDetail.breadJobPosts'), href: '/company/job-posts' }, { label: post?.title }]}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate('/company/job-posts')}>
              {t('common.back')}
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Sparkles size={15} />} onClick={() => navigate(`/company/job-posts/${id}/matches`)}>
              {t('companyJobMatches.title')}
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Pencil size={15} />} onClick={() => navigate(`/company/job-posts/${id}/edit`)}>
              {t('common.edit')}
            </Button>
          </div>
        }
      />

      {postLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
        </div>
      )}

      {!postLoading && post && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="card p-6 lg:col-span-2 space-y-5">
            {/* Meta badges row */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge status={post.status}>{post.status}</Badge>
              {post.employment_type && (
                <span className="text-sm flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={14} /> {post.employment_type.replace(/_/g, ' ')}
                </span>
              )}
              {post.job_type && (
                <Badge status="info">{post.job_type}</Badge>
              )}
              {post.level && (
                <Badge status={LEVEL_BADGE_STATUS[post.level] ?? 'info'}>{post.level}</Badge>
              )}
              {post.location && (
                <span className="text-sm flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <MapPin size={14} /> {post.location}
                </span>
              )}
              {(post.salary_min || post.salary_max) && (
                <span className="text-sm flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <DollarSign size={14} /> {post.salary_min}–{post.salary_max}
                </span>
              )}
              {post.experience_years != null && (
                <span className="text-sm flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Briefcase size={14} /> {post.experience_years}+ yr{post.experience_years !== 1 ? 's' : ''} exp.
                </span>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('companyJobPostDetail.description')}</h3>
              <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{post.description}</p>
            </div>

            {/* Responsibilities */}
            {responsibilities.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('companyJobPostDetail.responsibilities')}</h3>
                <ul className="space-y-1">
                  {responsibilities.map((item, i) => (
                    <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--primary)', flexShrink: 0 }}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Requirements */}
            {requirements.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('companyJobPostDetail.requirements')}</h3>
                <ul className="space-y-1">
                  {requirements.map((item, i) => (
                    <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--primary)', flexShrink: 0 }}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Stats sidebar */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Users size={18} style={{ color: 'var(--primary)' }} />
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('companyJobPostDetail.applicants')}</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {post.applicants_count ?? applicants?.length ?? 0}
            </p>

            {post.experience_years != null && (
              <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
                <BarChart2 size={15} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Experience required</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {post.experience_years}+ year{post.experience_years !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            {post.level && (
              <div className="flex items-center gap-2">
                <Briefcase size={15} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Seniority level</p>
                  <Badge status={LEVEL_BADGE_STATUS[post.level] ?? 'info'}>{post.level}</Badge>
                </div>
              </div>
            )}

            {post.job_type && (
              <div className="flex items-center gap-2">
                <Clock size={15} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Job type</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{post.job_type}</p>
                </div>
              </div>
            )}

            <p className="text-xs pt-2" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-default)' }}>
              {t('common.posted')} {formatDate(post.created_at)}
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('companyJobPostDetail.applicants')}</h3>
        </div>
        <DataTable
          columns={appColumns}
          data={applicants}
          loading={appLoading}
          error={appError}
          emptyTitle={t('companyJobPostDetail.noApplicantsYet')}
          emptyDescription={t('companyJobPostDetail.noApplicantsDesc')}
        />
      </div>
    </div>
  );
}
