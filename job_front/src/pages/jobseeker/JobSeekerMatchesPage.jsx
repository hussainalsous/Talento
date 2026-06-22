import { useState, useCallback } from 'react';
import { MapPin, Clock, DollarSign, Building2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { matchApi } from '../../api/matchApi';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { formatDate, extractPagination } from '../../utils/formatters';
import { formatScorePercent, scoreTier } from '../../utils/matchScore';

/** Build a usable logo URL from company.logo_path (storage path or null). */
const V1 = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const API_ORIGIN = (import.meta.env.VITE_API_ROOT_URL || V1.replace(/\/v1\/?$/, '')).replace(/\/api\/?$/, '');

function logoUrl(logoPath) {
  if (!logoPath) return null;
  if (/^https?:\/\//i.test(logoPath)) return logoPath;
  return `${API_ORIGIN}/storage/${logoPath.replace(/^\/+/, '')}`;
}

function MatchCard({ match }) {
  const { t } = useTranslation();
  const job = match.job_post ?? {};
  const company = job.company ?? {};
  const logo = logoUrl(company.logo_path);
  const { tier, badgeStatus } = scoreTier(match.match_score);

  return (
    <div className="card p-5 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden font-semibold"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
          >
            {logo
              ? <img src={logo} alt={company.name || ''} className="w-full h-full object-cover" />
              : (company.name?.[0]?.toUpperCase() || <Building2 size={18} />)}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {job.title || '—'}
            </h3>
            <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
              {company.name || '—'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {formatScorePercent(match.match_score)}
          </span>
          <Badge status={badgeStatus}>
            {tier === 'top' ? t('jobSeekerMatches.topMatch') : t('jobSeekerMatches.suggested')}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        {job.location && (
          <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
        )}
        {job.employment_type && (
          <span className="flex items-center gap-1"><Clock size={14} /> {job.employment_type.replace(/_/g, ' ')}</span>
        )}
        {(job.salary_min || job.salary_max) && (
          <span className="flex items-center gap-1">
            <DollarSign size={14} /> {parseFloat(job.salary_min || 0)}–{parseFloat(job.salary_max || 0)}
          </span>
        )}
      </div>

      <p className="text-xs pt-1" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-default)' }}>
        {t('common.posted')} {formatDate(match.matched_at)}
      </p>
    </div>
  );
}

export function JobSeekerMatchesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  const fetchFn = useCallback(() => matchApi.getMyMatches({ page }), [page]);
  const { data, loading, error, refetch } = useFetch(fetchFn, { deps: [page] });
  const { data: matches, pagination } = extractPagination(data);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('jobSeekerMatches.title')}
        subtitle={t('jobSeekerMatches.subtitle')}
      />

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-44 rounded-xl" />)}
        </div>
      ) : matches.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Sparkles}
            title={t('jobSeekerMatches.emptyTitle')}
            description={t('jobSeekerMatches.emptyDesc')}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {matches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
          {pagination && pagination.last_page > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('table.results', { from: pagination.from, to: pagination.to, total: pagination.total })}
              </span>
              <Pagination
                currentPage={pagination.current_page}
                lastPage={pagination.last_page}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
