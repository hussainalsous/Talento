import { useState, useCallback } from 'react';
import { UserCheck, UserX, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/adminApi';
import { useFetch } from '../../hooks/useFetch';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDate, humanizeRole, extractPagination } from '../../utils/formatters';
import { getUserDisplayName } from '../../app/useAuthStore';
import toast from 'react-hot-toast';

export function AdminUsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search,   setSearch]   = useState('');
  const [role,     setRole]     = useState('');
  const [isActive, setIsActive] = useState('');
  const [page,     setPage]     = useState(1);
  const [confirm,  setConfirm]  = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const ROLE_OPTIONS = [
    { value: '',               label: t('filters.allRoles')       },
    { value: 'admin',          label: t('filters.admin')          },
    { value: 'company_owner',  label: t('filters.companyOwner')   },
    { value: 'company_member', label: t('filters.companyMember')  },
    { value: 'job_seeker',     label: t('filters.jobSeeker')      },
  ];

  const ACTIVE_OPTIONS = [
    { value: '',    label: t('filters.allStatuses') },
    { value: '1',   label: t('common.active')       },
    { value: '0',   label: t('common.inactive')     },
  ];

  const debouncedSearch = useDebounce(search, 400);

  const fetchFn = useCallback(
    () => adminApi.getUsers({ search: debouncedSearch, role, is_active: isActive, page }),
    [debouncedSearch, role, isActive, page],
  );
  const { data, loading, error, refetch } = useFetch(fetchFn, { deps: [debouncedSearch, role, isActive, page] });
  const { data: rows, pagination } = extractPagination(data);

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      await adminApi.activateUser(confirm.user.id);
      toast.success(t('adminUsers.activatedToast'));
      setConfirm(null);
      refetch();
    } catch (e) { toast.error(e?.message || t('errors.generic.title')); }
    finally { setActionLoading(false); }
  };

  const handleDeactivate = async () => {
    setActionLoading(true);
    try {
      await adminApi.deactivateUser(confirm.user.id);
      toast.success(t('adminUsers.deactivatedToast'));
      setConfirm(null);
      refetch();
    } catch (e) { toast.error(e?.message || t('errors.generic.title')); }
    finally { setActionLoading(false); }
  };

  const columns = [
    {
      key: 'email', label: t('adminUsers.colUser'),
      render: (v, row) => (
        <div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {getUserDisplayName(row) || v}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{v}</p>
        </div>
      ),
    },
    { key: 'role',       label: t('adminUsers.colRole'),   render: (v) => humanizeRole(v) },
    {
      key: 'is_active', label: t('adminUsers.colStatus'),
      render: (v) => (
        <Badge status={v ? 'active' : 'inactive'}>{v ? t('common.active') : t('common.inactive')}</Badge>
      ),
    },
    { key: 'created_at', label: t('adminUsers.colJoined'), render: (v) => formatDate(v) },
    {
      key: 'actions', label: '', width: 120, align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/users/${row.id}`)} title="View">
            <Eye size={15} />
          </Button>
          {row.is_active ? (
            <Button variant="ghost" size="icon" onClick={() => setConfirm({ user: row, action: 'deactivate' })} title="Deactivate">
              <UserX size={15} style={{ color: 'var(--clr-danger-a10)' }} />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setConfirm({ user: row, action: 'activate' })} title="Activate">
              <UserCheck size={15} style={{ color: 'var(--clr-success-a0)' }} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('adminUsers.title')}
        subtitle={t('adminUsers.subtitle')}
        breadcrumbs={[{ label: t('adminDashboard.breadAdmin') }, { label: t('adminUsers.breadUsers') }]}
      />

      <div className="card">
        <div className="p-4 flex flex-wrap gap-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('adminUsers.searchPlaceholder')} />
          <Select
            options={ROLE_OPTIONS}
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
            className="w-44"
          />
          <Select
            options={ACTIVE_OPTIONS}
            value={isActive}
            onChange={(e) => { setIsActive(e.target.value); setPage(1); }}
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
          emptyTitle={t('adminUsers.emptyTitle')}
          emptyDescription={t('adminUsers.emptyDesc')}
        />
      </div>

      <ConfirmDialog
        open={confirm?.action === 'deactivate'}
        onClose={() => setConfirm(null)}
        onConfirm={handleDeactivate}
        loading={actionLoading}
        title={t('adminUsers.deactivateTitle')}
        message={t('adminUsers.deactivateMessage', { name: getUserDisplayName(confirm?.user) })}
        confirmLabel={t('adminUsers.deactivateButton')}
      />
      <ConfirmDialog
        open={confirm?.action === 'activate'}
        onClose={() => setConfirm(null)}
        onConfirm={handleActivate}
        loading={actionLoading}
        title={t('adminUsers.activateTitle')}
        message={t('adminUsers.activateMessage', { name: getUserDisplayName(confirm?.user) })}
        confirmLabel={t('adminUsers.activateButton')}
        variant="primary"
      />
    </div>
  );
}
