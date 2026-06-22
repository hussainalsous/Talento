import { useState, useCallback } from 'react';
import { Eye, FileText, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { companyApi } from '../../api/companyApi';
import { useFetch } from '../../hooks/useFetch';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { formatDate, extractPagination } from '../../utils/formatters';
import toast from 'react-hot-toast';

export function CompanyCandidatesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search,   setSearch]   = useState('');
  const [jobType,  setJobType]  = useState('');
  const [page,     setPage]     = useState(1);
  const [cvRequesting, setCvRequesting] = useState({});
  const debouncedSearch = useDebounce(search, 400);

  const JOB_TYPE_OPTIONS = [
    { value: '', label: t('filters.allTypes')     },
    { value: 'full_time',  label: t('filters.fullTime')  },
    { value: 'part_time',  label: t('filters.partTime')  },
    { value: 'contract',   label: t('filters.contract')  },
    { value: 'internship', label: t('filters.internship')},
    { value: 'remote',     label: t('filters.remote')    },
  ];

  const fetchFn = useCallback(
    () => companyApi.getCandidates({ search: debouncedSearch, preferred_job_type: jobType, page }),
    [debouncedSearch, jobType, page],
  );
  const { data, loading, error, refetch } = useFetch(fetchFn, { deps: [debouncedSearch, jobType, page] });
  const { data: rows, pagination } = extractPagination(data);

  const requestCV = async (candidateId) => {
    setCvRequesting((prev) => ({ ...prev, [candidateId]: true }));
    try {
      await companyApi.requestCvAccess(candidateId);
      toast.success(t('companyCandidates.cvAccessSent'));
    } catch (e) {
      toast.error(e?.message || t('errors.generic.title'));
    } finally {
      setCvRequesting((prev) => ({ ...prev, [candidateId]: false }));
    }
  };

  const columns = [
    {
      key: 'full_name', label: t('companyCandidates.colCandidate'),
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
          >
            {v?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{v || '—'}</p>
            {row.preferred_job_type && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {row.preferred_job_type.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>
      ),
    },
    { key: 'location', label: t('companyCandidates.colLocation'), render: (v) => v || '—' },
    {
      key: 'cv_visibility', label: t('companyCandidates.colCV'),
      render: (v, row) => v === 'public' && row.primary_cv?.file_url
        ? (
          <a href={row.primary_cv.file_url} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm" leftIcon={<FileText size={14} />}>{t('companyCandidates.viewCV')}</Button>
          </a>
        )
        : (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FileText size={14} />}
            loading={!!cvRequesting[row.id]}
            onClick={() => requestCV(row.id)}
          >
            {t('companyCandidates.requestCV')}
          </Button>
        ),
    },
    {
      key: 'actions', label: '', width: 80, align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/company/candidates/${row.id}`)} title={t('common.viewAll')}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/company/invitations', { state: { candidateId: row.id } })} title={t('companyCandidateDetail.inviteButton')}>
            <Send size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('companyCandidates.title')}
        subtitle={t('companyCandidates.subtitle')}
        breadcrumbs={[{ label: t('companyDashboard.breadCompany') }, { label: t('companyCandidates.breadCandidates') }]}
      />
      <div className="card">
        <div className="p-4 flex flex-wrap gap-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('companyCandidates.searchPlaceholder')} />
          <Select
            options={JOB_TYPE_OPTIONS}
            value={jobType}
            onChange={(e) => { setJobType(e.target.value); setPage(1); }}
            className="w-40"
          />
        </div>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          error={error}
          onRetry={refetch}
          pagination={pagination}
          onPageChange={setPage}
          emptyTitle={t('companyCandidates.emptyTitle')}
          emptyDescription={t('companyCandidates.emptyDesc')}
        />
      </div>
    </div>
  );
}
