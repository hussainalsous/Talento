import { useState, useCallback } from 'react';
import { Trash2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/adminApi';
import { useFetch } from '../../hooks/useFetch';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDate, extractPagination } from '../../utils/formatters';
import toast from 'react-hot-toast';

export function AdminCVsPage() {
  const { t } = useTranslation();
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);
  const [deleteTarget, setDelete] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  const fetchFn = useCallback(
    () => adminApi.getCandidates({ search: debouncedSearch, page }),
    [debouncedSearch, page],
  );
  const { data, loading, error, refetch } = useFetch(fetchFn, { deps: [debouncedSearch, page] });
  const { data: rows, pagination } = extractPagination(data);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.deleteCV(deleteTarget.cvId);
      toast.success(t('adminCVs.deletedToast'));
      setDelete(null);
      refetch();
    } catch (e) { toast.error(e?.message || t('errors.generic.title')); }
    finally { setDeleting(false); }
  };

  const columns = [
    {
      key: 'full_name', label: t('adminCVs.colCandidate'),
      render: (v, row) => (
        <div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{v || '—'}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.location || ''}</p>
        </div>
      ),
    },
    {
      key: 'primary_cv', label: t('adminCVs.colPrimaryCV'),
      render: (v) => v
        ? <a href={v.file_url || '#'} target="_blank" rel="noreferrer" className="text-sm" style={{ color: 'var(--primary)' }}>
            {v.filename || t('adminCVs.viewCV')}
          </a>
        : <span style={{ color: 'var(--text-muted)' }}>{t('adminCVs.noCV')}</span>,
    },
    { key: 'cv_visibility', label: t('adminCVs.colCVVisibility'), render: (v) => v || '—' },
    { key: 'created_at',    label: t('adminCVs.colJoined'),       render: (v) => formatDate(v) },
    {
      key: 'actions', label: '', width: 80, align: 'right',
      render: (_, row) => row.primary_cv
        ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDelete({ cvId: row.primary_cv.id, candidateName: row.full_name })}
            title={t('adminCVs.deleteButton')}
          >
            <Trash2 size={15} style={{ color: 'var(--clr-danger-a10)' }} />
          </Button>
        )
        : null,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('adminCVs.title')}
        subtitle={t('adminCVs.subtitle')}
        breadcrumbs={[{ label: t('adminDashboard.breadAdmin') }, { label: t('adminCVs.breadCVs') }]}
      />

      <div
        className="rounded-xl px-4 py-3 flex items-start gap-3 text-sm"
        style={{ background: 'var(--status-info-bg)', border: '1px solid var(--status-info-text)', color: 'var(--status-info-text)' }}
      >
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>{t('adminCVs.infoMessage')}</span>
      </div>

      <div className="card">
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('adminCVs.searchPlaceholder')} />
        </div>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          error={error}
          onRetry={refetch}
          pagination={pagination}
          onPageChange={setPage}
          emptyTitle={t('adminCVs.emptyTitle')}
          emptyDescription={t('adminCVs.emptyDesc')}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={t('adminCVs.deleteTitle')}
        message={t('adminCVs.deleteMessage', { name: deleteTarget?.candidateName })}
        confirmLabel={t('adminCVs.deleteButton')}
      />
    </div>
  );
}
