import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Send, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { companyApi } from '../../api/companyApi';
import { useFetch } from '../../hooks/useFetch';
import { StatCard } from '../../components/layout/StatCard';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { ErrorState } from '../../components/feedback/ErrorState';
import { formatDate, extractPagination } from '../../utils/formatters';

export function CompanyDashboardPage() {
  const { t } = useTranslation();
  const fetchPosts       = useCallback(() => companyApi.getJobPosts({ per_page: 5 }), []);
  const fetchInvitations = useCallback(() => companyApi.getInvitations({ per_page: 1 }), []);

  const { data: postsData,  loading: postsLoading,  error: postsError,  refetch: refetchPosts  } = useFetch(fetchPosts);
  const { data: invData,    loading: invLoading,    error: invError,    refetch: refetchInv    } = useFetch(fetchInvitations);

  const { data: recentPosts, pagination: postsMeta }   = extractPagination(postsData);
  const { pagination: invMeta }                        = extractPagination(invData);

  const publishedCount = recentPosts.filter((p) => p.status === 'published').length;

  const hasError = postsError || invError;
  if (hasError) return (
    <ErrorState
      message={postsError || invError}
      onRetry={() => { refetchPosts(); refetchInv(); }}
    />
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('companyDashboard.title')}
        subtitle={t('companyDashboard.subtitle')}
        breadcrumbs={[{ label: t('companyDashboard.breadCompany') }, { label: t('companyDashboard.breadDashboard') }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label={t('companyDashboard.totalJobPosts')}
          value={postsMeta?.total}
          icon={Briefcase}
          loading={postsLoading}
          color={{ bg: 'var(--primary-light)', icon: 'var(--primary)' }}
        />
        <StatCard
          label={t('companyDashboard.publishedPositions')}
          value={postsMeta?.total !== undefined ? publishedCount : undefined}
          icon={Users}
          loading={postsLoading}
          color={{ bg: 'var(--status-active-bg)', icon: 'var(--status-active-text)' }}
        />
        <StatCard
          label={t('companyDashboard.invitationsSent')}
          value={invMeta?.total}
          icon={Send}
          loading={invLoading}
          color={{ bg: 'var(--status-pending-bg)', icon: 'var(--status-pending-text)' }}
        />
      </div>

      <div className="card">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('companyDashboard.recentJobPosts')}</h3>
          <Link to="/company/job-posts" className="text-sm" style={{ color: 'var(--primary)' }}>{t('common.viewAll')}</Link>
        </div>
        <div>
          {postsLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <div className="skeleton h-4 flex-1 rounded" />
                  <div className="skeleton h-5 w-20 rounded-full" />
                </div>
              ))
            : recentPosts.length === 0
            ? <p className="px-5 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>{t('companyDashboard.noJobPostsYet')}</p>
            : recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: '1px solid var(--border-default)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{post.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {post.location || t('common.remote')} · {formatDate(post.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {post.applicants_count !== undefined && (
                      <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
                        {t('companyDashboard.applicant', { count: post.applicants_count })}
                      </span>
                    )}
                    <Badge status={post.status}>{post.status}</Badge>
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}
