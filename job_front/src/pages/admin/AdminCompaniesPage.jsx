import { useState, useCallback } from 'react';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/adminApi';
import { useFetch } from '../../hooks/useFetch';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { extractPagination } from '../../utils/formatters';

export function AdminCompaniesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const fetchFn = useCallback(
    () => adminApi.getCompanyRequests({ search: debouncedSearch, status: 'approved', page }),
    [debouncedSearch, page],
  );
  const { data, loading, error, refetch } = useFetch(fetchFn, { deps: [debouncedSearch, page] });
  const { data: rows, pagination } = extractPagination(data);

  const columns = [
    {
      key: 'company_name', label: t('adminCompanies.colCompany'),
      render: (v, row) => (
        <div className="flex items-center gap-3">
          {row.logo_url
            ? <img src={row.logo_url} alt={v} className="w-9 h-9 rounded-lg object-cover" />
            : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                {v?.[0]}
              </div>
            )
          }
          <div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{v}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Reg: {row.registration_number || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'requester_first_name', label: t('adminCompanies.colOwner'),
      render: (v, row) => `${v || ''} ${row.requester_last_name || ''}`.trim() || '—',
    },
    { key: 'country',    label: t('adminCompanies.colCountry'),    render: (v) => v || '—' },
    { key: 'approved_at', label: t('adminCompanies.colApproved'), render: (_, row) => row.reviewed_at ? new Date(row.reviewed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—' },
    {
      key: 'actions', label: '', width: 80, align: 'right',
      render: (_, row) => (
        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/companies/${row.id}`)} title="View">
          <Eye size={15} />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('adminCompanies.title')}
        subtitle={t('adminCompanies.subtitle')}
        breadcrumbs={[{ label: t('adminDashboard.breadAdmin') }, { label: t('adminCompanies.breadCompanies') }]}
      />
      <div
        className="rounded-xl px-4 py-3 flex items-start gap-3 text-sm"
        style={{ background: 'var(--status-info-bg)', border: '1px solid var(--status-info-text)', color: 'var(--status-info-text)' }}
      >
        <span>{t('adminCompanies.infoMessage')}</span>
      </div>
      <div className="card">
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('adminCompanies.searchPlaceholder')} />
        </div>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          error={error}
          onRetry={refetch}
          pagination={pagination}
          onPageChange={setPage}
          emptyTitle={t('adminCompanies.emptyTitle')}
          emptyDescription={t('adminCompanies.emptyDesc')}
        />
      </div>
    </div>
  );
}
