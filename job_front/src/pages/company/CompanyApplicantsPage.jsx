import { useState, useCallback } from 'react';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { companyApi } from '../../api/companyApi';
import { useFetch } from '../../hooks/useFetch';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/feedback/ErrorState';
import { formatDate, extractPagination } from '../../utils/formatters';

export function CompanyApplicantsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedJob, setSelectedJob] = useState('');
  const [status, setStatus]           = useState('');
  const [page,   setPage]             = useState(1);

  const STATUS_OPTIONS = [
    { value: '',             label: t('filters.allStatuses')              },
    { value: 'under_review', label: t('companyApplicants.statusUnderReview') },
    { value: 'shortlisted',  label: t('companyApplicants.statusShortlisted') },
    { value: 'accepted',     label: t('companyApplicants.statusAccepted')    },
    { value: 'rejected',     label: t('companyApplicants.statusRejected')    },
  ];

  const fetchPosts = useCallback(() => companyApi.getJobPosts({ per_page: 100 }), []);
  const { data: postsData, loading: postsLoading, error: postsError } = useFetch(fetchPosts);
  const { data: jobPosts } = extractPagination(postsData);

  const jobOptions = [
    { value: '', label: t('companyApplicants.selectJobPost') },
    ...jobPosts.map((p) => ({ value: String(p.id), label: p.title })),
  ];

  const fetchApplicants = useCallback(
    () => selectedJob ? companyApi.getJobPostApplicants(selectedJob, { status, page }) : Promise.resolve(null),
    [selectedJob, status, page],
  );
  const { data, loading, error, refetch } = useFetch(fetchApplicants, { deps: [selectedJob, status, page] });
  const { data: rows, pagination } = extractPagination(data);

  const columns = [
    {
      key: 'candidate', label: t('companyApplicants.colCandidate'),
      render: (v) => (
        <div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {v?.full_name || v?.name || '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{v?.email || ''}</p>
        </div>
      ),
    },
    {
      key: 'status', label: t('companyApplicants.colStatus'),
      render: (v) => <Badge status={v}>{v?.replace(/_/g, ' ')}</Badge>,
    },
    { key: 'created_at', label: t('companyApplicants.colApplied'), render: (v) => formatDate(v) },
    {
      key: 'actions', label: '', width: 80, align: 'right',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/company/applicants/${row.id}`, { state: { application: row } })}
          title={t('common.viewAll')}
        >
          <Eye size={15} />
        </Button>
      ),
    },
  ];

  if (postsError) return <ErrorState message={postsError} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('companyApplicants.title')}
        subtitle={t('companyApplicants.subtitle')}
        breadcrumbs={[{ label: t('companyDashboard.breadCompany') }, { label: t('companyApplicants.breadApplicants') }]}
      />

      <div className="card">
        <div className="p-4 flex flex-wrap gap-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <Select
            options={postsLoading ? [{ value: '', label: t('common.loading') }] : jobOptions}
            value={selectedJob}
            onChange={(e) => { setSelectedJob(e.target.value); setPage(1); }}
            className="flex-1 min-w-48"
          />
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-44"
          />
        </div>

        {!selectedJob
          ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('companyApplicants.selectJobFirst')}
              </p>
            </div>
          )
          : (
            <DataTable
              columns={columns}
              data={rows}
              loading={loading}
              error={error}
              onRetry={refetch}
              pagination={pagination}
              onPageChange={setPage}
              emptyTitle={t('companyApplicants.emptyTitle')}
              emptyDescription={t('companyApplicants.emptyDesc')}
            />
          )
        }
      </div>
    </div>
  );
}
