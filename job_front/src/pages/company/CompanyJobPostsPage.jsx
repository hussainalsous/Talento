import { useState, useCallback } from 'react';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { companyApi } from '../../api/companyApi';
import { useFetch } from '../../hooks/useFetch';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDate, extractPagination } from '../../utils/formatters';
import toast from 'react-hot-toast';

export function CompanyJobPostsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page,   setPage]   = useState(1);
  const [deleteTarget, setDelete] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  const STATUS_OPTIONS = [
    { value: '',          label: t('filters.allStatuses') },
    { value: 'draft',     label: t('common.draft')        },
    { value: 'published', label: t('common.published')    },
    { value: 'closed',    label: t('common.closed')       },
    { value: 'archived',  label: t('common.archived')     },
  ];

  const fetchFn = useCallback(
    () => companyApi.getJobPosts({ search: debouncedSearch, status, page }),
    [debouncedSearch, status, page],
  );
  const { data, loading, error, refetch } = useFetch(fetchFn, { deps: [debouncedSearch, status, page] });
  const { data: rows, pagination } = extractPagination(data);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await companyApi.deleteJobPost(deleteTarget.id);
      toast.success(t('companyJobPosts.deletedToast'));
      setDelete(null);
      refetch();
    } catch (e) { toast.error(e?.message || t('errors.generic.title')); }
    finally { setDeleting(false); }
  };

  const columns = [
    { key: 'title', label: t('companyJobPosts.colPosition'), render: (v, row) => (
      <div>
        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{v}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.location || t('common.remote')} · {row.employment_type || '—'}</p>
      </div>
    )},
    { key: 'status',           label: t('companyJobPosts.colStatus'),     render: (v) => <Badge status={v}>{v}</Badge> },
    { key: 'applicants_count', label: t('companyJobPosts.colApplicants'), render: (v) => v ?? 0 },
    { key: 'created_at',       label: t('companyJobPosts.colPosted'),     render: (v) => formatDate(v) },
    { key: 'actions',          label: '', width: 120, align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/company/job-posts/${row.id}`)} title={t('common.viewAll')}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/company/job-posts/${row.id}/edit`)} title={t('common.edit')}>
            <Pencil size={15} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDelete(row)} title={t('common.delete')}>
            <Trash2 size={15} style={{ color: 'var(--clr-danger-a10)' }} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('companyJobPosts.title')}
        subtitle={t('companyJobPosts.subtitle')}
        breadcrumbs={[{ label: t('companyDashboard.breadCompany') }, { label: t('companyJobPosts.breadJobPosts') }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus size={15} />} onClick={() => navigate('/company/job-posts/new')}>
            {t('companyJobPosts.newButton')}
          </Button>
        }
      />

      <div className="card">
        <div className="p-4 flex flex-wrap gap-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('companyJobPosts.searchPlaceholder')} />
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-36"
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
          emptyTitle={t('companyJobPosts.emptyTitle')}
          emptyDescription={t('companyJobPosts.emptyDesc')}
          emptyAction={<Button variant="primary" size="sm" onClick={() => navigate('/company/job-posts/new')}>{t('companyJobPosts.createButton')}</Button>}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={t('companyJobPosts.deleteTitle')}
        message={t('companyJobPosts.deleteMessage', { title: deleteTarget?.title })}
      />
    </div>
  );
}
