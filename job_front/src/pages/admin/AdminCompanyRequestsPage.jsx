import { useState, useCallback, useEffect, useRef } from 'react';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/adminApi';
import { useFetch } from '../../hooks/useFetch';
import { useDebounce } from '../../hooks/useDebounce';
import { useForm } from '../../hooks/useForm';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { formatDate, extractPagination } from '../../utils/formatters';
import toast from 'react-hot-toast';

export function AdminCompanyRequestsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [page,    setPage]    = useState(1);
  const [rejectModal,   setRejectModal]   = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const STATUS_OPTIONS = [
    { value: '',         label: t('filters.allStatuses') },
    { value: 'pending',  label: t('common.pending')      },
    { value: 'approved', label: t('common.approved')     },
    { value: 'rejected', label: t('common.rejected')     },
  ];

  const { values: rejectForm, handleChange: handleRejectChange, isValid: isRejectValid, errors: rejectErrors, reset: resetReject } = useForm(
    { rejection_reason: '' },
    (v) => (!v.rejection_reason ? { rejection_reason: t('adminCompanyRequests.rejectReasonRequired') } : {}),
  );

  const fetchFn = useCallback(
    () => adminApi.getCompanyRequests({ search: debouncedSearch, status, page }),
    [debouncedSearch, status, page],
  );
  const { data, loading, error, refetch } = useFetch(fetchFn, { deps: [debouncedSearch, status, page] });
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  const { data: rows, pagination } = extractPagination(data);

  // [DEBUG] Log on every render — remove when verified
  console.log(
    `%c[CompanyRequests] render #${renderCountRef.current} | rows.length = ${rows.length}`,
    'color: #9b59b6; font-weight: bold;',
  );

  // [DEBUG] Log each resolved API response — remove when verified
  useEffect(() => {
    if (data?.data) {
      console.log(
        `%c[CompanyRequests] API response resolved | data.length = ${data.data.length} | meta.total = ${data?.meta?.total ?? '?'}`,
        'color: #2980b9; font-weight: bold;',
        { page: data?.meta?.current_page, items: data.data.length },
      );
    }
  }, [data]);

  const handleApprove = async (req) => {
    setActionLoading(true);
    try {
      await adminApi.approveCompanyRequest(req.id);
      toast.success(t('adminCompanyRequests.approvedToast'));
      refetch();
    } catch (e) { toast.error(e?.message || t('errors.generic.title')); }
    finally { setActionLoading(false); }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  const handleReject = async () => {
    if (!isRejectValid()) return;
    setActionLoading(true);
    try {
      await adminApi.rejectCompanyRequest(rejectModal.id, rejectForm.rejection_reason);
      toast.success(t('adminCompanyRequests.rejectedToast'));
      setRejectModal(null);
      resetReject();
      refetch();
    } catch (e) { toast.error(e?.message || t('errors.generic.title')); }
    finally { setActionLoading(false); }
  };

  const columns = [
    {
      key: 'company_name', label: t('adminCompanyRequests.colCompany'),
      render: (v, row) => (
        <div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{v}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Reg: {row.registration_number || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'requester_first_name', label: t('adminCompanyRequests.colSubmittedBy'),
      render: (v, row) => `${v || ''} ${row.requester_last_name || ''}`.trim() || '—',
    },
    { key: 'status',     label: t('adminCompanyRequests.colStatus'),    render: (v) => <Badge status={v}>{v}</Badge> },
    { key: 'created_at', label: t('adminCompanyRequests.colSubmitted'), render: (v) => formatDate(v) },
    {
      key: 'actions', label: '', width: 140, align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/company-requests/${row.id}`)} title="View">
            <Eye size={15} />
          </Button>
          {row.status === 'pending' && (
            <>
              <Button variant="ghost" size="icon" onClick={() => handleApprove(row)} title="Approve" disabled={actionLoading}>
                <CheckCircle size={15} style={{ color: 'var(--clr-success-a0)' }} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setRejectModal(row)} title="Reject">
                <XCircle size={15} style={{ color: 'var(--clr-danger-a10)' }} />
              </Button>
            </>
          )}
        </div>
      ),
    },
    {
  key: 'email_verified_at',
  label: 'Email',
  render: (v) =>
    v ? (
      <Badge status="approved">Verified</Badge>
    ) : (
      <Badge status="pending">Not Verified</Badge>
    ),
},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('adminCompanyRequests.title')}
        subtitle={t('adminCompanyRequests.subtitle')}
        breadcrumbs={[{ label: t('adminDashboard.breadAdmin') }, { label: t('adminCompanyRequests.breadRequests') }]}
      />

      <div className="card">
        <div className="p-4 flex flex-wrap gap-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('adminCompanyRequests.searchPlaceholder')} />
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
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
          emptyTitle={t('adminCompanyRequests.emptyTitle')}
          emptyDescription={t('adminCompanyRequests.emptyDesc')}
          debugLabel="CompanyRequests"
        />
      </div>

      {/* Reject Modal */}
      <Modal
        open={!!rejectModal}
        onClose={() => { setRejectModal(null); resetReject(); }}
        title={t('adminCompanyRequests.rejectModalTitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRejectModal(null); resetReject(); }} disabled={actionLoading}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleReject} loading={actionLoading}>
              {t('adminCompanyRequests.rejectButton')}
            </Button>
          </>
        }
      >
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Provide a reason for rejecting <strong>{rejectModal?.company_name}</strong>.
        </p>
        <Textarea
          label={t('adminCompanyRequests.rejectReason')}
          name="rejection_reason"
          value={rejectForm.rejection_reason}
          onChange={handleRejectChange}
          error={rejectErrors.rejection_reason}
          rows={3}
          placeholder={t('adminCompanyRequests.rejectReasonPlaceholder')}
          required
        />
      </Modal>
    </div>
  );
}
