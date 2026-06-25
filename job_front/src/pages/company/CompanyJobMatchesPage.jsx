import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { matchApi } from '../../api/matchApi';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { ScoreBreakdown } from '../../components/ui/ScoreBreakdown';
import { formatDate, extractPagination } from '../../utils/formatters';
import { formatScorePercent, scoreTier, MATCH_STATUS_BADGE } from '../../utils/matchScore';

/** Candidate display name from the nested job_seeker (may be null). */
function candidateName(candidate) {
  const js = candidate?.job_seeker;
  if (js && (js.first_name || js.last_name)) {
    return `${js.first_name ?? ''} ${js.last_name ?? ''}`.trim();
  }
  return candidate?.email || '—';
}

export function CompanyJobMatchesPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [minScore, setMinScore] = useState('');
  const [status,   setStatus]   = useState('');
  const [page,     setPage]     = useState(1);
  const [rows,     setRows]     = useState([]);
  const [updating, setUpdating] = useState({});

  const MIN_SCORE_OPTIONS = [
    { value: '',    label: t('companyJobMatches.scoreAny') },
    { value: '0.6', label: '60%' },
    { value: '0.7', label: '70%' },
    { value: '0.8', label: '80%' },
    { value: '0.9', label: '90%' },
  ];

  const STATUS_OPTIONS = [
    { value: '',                 label: t('filters.allStatuses') },
    { value: 'new',              label: t('matchStatus.new') },
    { value: 'viewed',           label: t('matchStatus.viewed') },
    { value: 'shortlisted',      label: t('matchStatus.shortlisted') },
    { value: 'auto_shortlisted', label: t('matchStatus.auto_shortlisted') },
    { value: 'rejected',         label: t('matchStatus.rejected') },
  ];

  const fetchFn = useCallback(
    () => matchApi.getJobMatches(id, {
      min_score: minScore || undefined,
      status:    status   || undefined,
      page,
    }),
    [id, minScore, status, page],
  );
  const { data, loading, error, refetch } = useFetch(fetchFn, { deps: [id, minScore, status, page] });
  const { data: fetchedRows, pagination } = extractPagination(data);

  // Keep a local, optimistically-mutable copy of the fetched rows.
  useEffect(() => { setRows(fetchedRows); }, [data]); // eslint-disable-line

  const changeStatus = async (match, newStatus) => {
    if (match.status === newStatus) return;
    const prevRows = rows;
    setUpdating((u) => ({ ...u, [match.id]: true }));
    setRows((rs) => rs.map((r) => (r.id === match.id ? { ...r, status: newStatus } : r)));
    try {
      const res = await matchApi.updateMatchStatus(id, match.id, newStatus);
      const updated = res?.data?.data ?? res?.data;
      if (updated?.id) {
        setRows((rs) => rs.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      }
      toast.success(t('companyJobMatches.updated'));
    } catch (e) {
      setRows(prevRows); // rollback
      toast.error(e?.message || t('companyJobMatches.updateFailed'));
      refetch();
    } finally {
      setUpdating((u) => ({ ...u, [match.id]: false }));
    }
  };

  const columns = [
    {
      key: 'candidate', label: t('companyJobMatches.colCandidate'),
      render: (candidate) => {
        const name = candidateName(candidate);
        return (
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
            >
              {name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{name}</p>
              {candidate?.email && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{candidate.email}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'match_score', label: t('companyJobMatches.colScore'),
      render: (v, row) => {
        const { tier, badgeStatus } = scoreTier(v);
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {formatScorePercent(v)}
              </span>
              <Badge status={badgeStatus}>
                {tier === 'top' ? t('jobSeekerMatches.topMatch') : t('jobSeekerMatches.suggested')}
              </Badge>
            </div>
            <ScoreBreakdown breakdown={row.score_breakdown} />
          </div>
        );
      },
    },
    {
      key: 'status', label: t('companyJobMatches.colStatus'),
      render: (v) => <Badge status={MATCH_STATUS_BADGE[v] ?? 'inactive'}>{t(`matchStatus.${v}`, v)}</Badge>,
    },
    {
      key: 'matched_at', label: t('companyJobMatches.colMatched'),
      render: (v) => formatDate(v),
    },
    {
      key: 'actions', label: '', align: 'right',
      render: (_, row) => {
        const busy = !!updating[row.id];
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost" size="sm" leftIcon={<CheckCircle2 size={15} />}
              loading={busy}
              disabled={busy || row.status === 'shortlisted'}
              onClick={() => changeStatus(row, 'shortlisted')}
              title={t('companyJobMatches.shortlist')}
            >
              {t('companyJobMatches.shortlist')}
            </Button>
            <Button
              variant="ghost" size="sm" leftIcon={<XCircle size={15} />}
              disabled={busy || row.status === 'rejected'}
              onClick={() => changeStatus(row, 'rejected')}
              title={t('companyJobMatches.reject')}
            >
              {t('companyJobMatches.reject')}
            </Button>
            <Button
              variant="ghost" size="icon"
              disabled={busy || row.status === 'new'}
              onClick={() => changeStatus(row, 'new')}
              title={t('companyJobMatches.resetStatus')}
            >
              <RotateCcw size={15} />
            </Button>
          </div>
        );
      },
    },
  ];

  const refreshAction = (
    <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={15} />} onClick={() => refetch()} loading={loading}>
      {t('companyJobMatches.refresh')}
    </Button>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('companyJobMatches.title')}
        subtitle={t('companyJobMatches.subtitle')}
        breadcrumbs={[
          { label: t('companyDashboard.breadCompany') },
          { label: t('companyJobPostDetail.breadJobPosts'), href: '/company/job-posts' },
          { label: t('companyJobMatches.title') },
        ]}
        actions={
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate(`/company/job-posts/${id}`)}>
            {t('common.back')}
          </Button>
        }
      />

      <div className="card">
        <div className="p-4 flex flex-wrap items-end gap-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <Select
            label={t('companyJobMatches.filterMinScore')}
            options={MIN_SCORE_OPTIONS}
            value={minScore}
            onChange={(e) => { setMinScore(e.target.value); setPage(1); }}
            className="w-36"
          />
          <Select
            label={t('companyJobMatches.filterStatus')}
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-44"
          />
          <div className="ms-auto">{refreshAction}</div>
        </div>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          error={error}
          onRetry={refetch}
          pagination={pagination}
          onPageChange={setPage}
          emptyTitle={t('companyJobMatches.emptyTitle')}
          emptyDescription={t('companyJobMatches.emptyDesc')}
          emptyAction={refreshAction}
        />
      </div>
    </div>
  );
}
