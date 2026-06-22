import { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { companyApi } from '../../api/companyApi';
import { useFetch } from '../../hooks/useFetch';
import { useForm } from '../../hooks/useForm';
import { useAuthStore } from '../../app/useAuthStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Avatar } from '../../components/ui/Avatar';
import { formatDate, humanizeRole, extractPagination } from '../../utils/formatters';
import toast from 'react-hot-toast';

export function CompanyMembersPage() {
  const { t } = useTranslation();
  const isOwner = useAuthStore((s) => s.isCompanyOwner());
  const [page, setPage]           = useState(1);
  const [modal,  setModal]        = useState(null);
  const [deleteTarget, setDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const ROLE_OPTIONS = [
    { value: 'company_owner',  label: t('filters.companyOwner')  },
    { value: 'company_member', label: t('filters.companyMember') },
  ];

  const validateCreate = (v) => {
    const e = {};
    if (!v.first_name) e.first_name = t('companyMembers.validFirstName');
    if (!v.last_name)  e.last_name  = t('companyMembers.validLastName');
    if (!v.email)      e.email      = t('companyMembers.validEmail');
    if (!v.password)   e.password   = t('companyMembers.validPassword');
    return e;
  };
  const validateEdit = (v) => {
    const e = {};
    if (!v.first_name) e.first_name = t('companyMembers.validFirstName');
    if (!v.last_name)  e.last_name  = t('companyMembers.validLastName');
    return e;
  };

  const fetchFn = useCallback(() => companyApi.getMembers({ page }), [page]);
  const { data, loading, error, refetch } = useFetch(fetchFn, { deps: [page] });
  const { data: rows, pagination } = extractPagination(data);

  const createForm = useForm(
    { first_name: '', last_name: '', email: '', password: '', role_in_company: 'company_member' },
    validateCreate,
  );
  const editForm = useForm(
    { first_name: '', last_name: '', role_in_company: 'company_member' },
    validateEdit,
  );

  const openCreate = () => { createForm.reset(); setModal('create'); };
  const openEdit   = (m) => {
    editForm.setValues({
      first_name:      m.first_name      || '',
      last_name:       m.last_name       || '',
      role_in_company: m.role_in_company || 'company_member',
    });
    setModal(m);
  };

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (!createForm.isValid()) return;
    setSubmitting(true);
    try {
      await companyApi.addMember(createForm.values);
      toast.success(t('companyMembers.addedToast'));
      setModal(null);
      createForm.reset();
      refetch();
    } catch (err) {
      if (err?.errors) createForm.setServerErrors(err.errors);
      else toast.error(err?.message || t('errors.generic.title'));
    } finally { setSubmitting(false); }
  };

  const handleEdit = async (e) => {
    e?.preventDefault();
    if (!editForm.isValid()) return;
    setSubmitting(true);
    try {
      await companyApi.updateMember(modal.id, {
        first_name:      editForm.values.first_name,
        last_name:       editForm.values.last_name,
        role_in_company: editForm.values.role_in_company,
      });
      toast.success(t('companyMembers.updatedToast'));
      setModal(null);
      refetch();
    } catch (err) {
      if (err?.errors) editForm.setServerErrors(err.errors);
      else toast.error(err?.message || t('errors.generic.title'));
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await companyApi.removeMember(deleteTarget.id);
      toast.success(t('companyMembers.removedToast'));
      setDelete(null);
      refetch();
    } catch (e) { toast.error(e?.message || t('errors.generic.title')); }
    finally { setSubmitting(false); }
  };

  const columns = [
    {
      key: 'full_name', label: t('companyMembers.colMember'),
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <Avatar name={v} size="sm" />
          <div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{v || '—'}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role_in_company', label: t('companyMembers.colRole'),
      render: (v) => <Badge status="info">{humanizeRole(v)}</Badge>,
    },
    {
      key: 'is_active', label: t('companyMembers.colStatus'),
      render: (v) => <Badge status={v !== false ? 'active' : 'inactive'}>{v !== false ? t('common.active') : t('common.inactive')}</Badge>,
    },
    { key: 'created_at', label: t('companyMembers.colJoined'), render: (v) => formatDate(v) },
    ...(isOwner ? [{
      key: 'actions', label: '', width: 100, align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title={t('common.edit')}>
            <Pencil size={15} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDelete(row)} title={t('common.delete')}>
            <Trash2 size={15} style={{ color: 'var(--clr-danger-a10)' }} />
          </Button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('companyMembers.title')}
        subtitle={t('companyMembers.subtitle')}
        breadcrumbs={[{ label: t('companyDashboard.breadCompany') }, { label: t('companyMembers.breadMembers') }]}
        actions={isOwner && (
          <Button variant="primary" size="sm" leftIcon={<Plus size={15} />} onClick={openCreate}>
            {t('companyMembers.addButton')}
          </Button>
        )}
      />
      <div className="card">
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          error={error}
          onRetry={refetch}
          pagination={pagination}
          onPageChange={setPage}
          emptyTitle={t('companyMembers.emptyTitle')}
          emptyDescription={t('companyMembers.emptyDesc')}
          emptyAction={isOwner && <Button variant="primary" size="sm" onClick={openCreate}>{t('companyMembers.addButton')}</Button>}
        />
      </div>

      <Modal
        open={modal === 'create'}
        onClose={() => { setModal(null); createForm.reset(); }}
        title={t('companyMembers.addModalTitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setModal(null); createForm.reset(); }} disabled={submitting}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleCreate} loading={submitting}>{t('companyMembers.addMemberButton')}</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="flex justify-center pb-2">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
              style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
            >
              {(createForm.values.first_name?.[0] || '?').toUpperCase()}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('companyMembers.labelFirstName')}
              name="first_name"
              value={createForm.values.first_name}
              onChange={createForm.handleChange}
              error={createForm.errors.first_name}
              required
              placeholder={t('companyMembers.firstNamePlaceholder')}
            />
            <Input
              label={t('companyMembers.labelLastName')}
              name="last_name"
              value={createForm.values.last_name}
              onChange={createForm.handleChange}
              error={createForm.errors.last_name}
              required
              placeholder={t('companyMembers.lastNamePlaceholder')}
            />
          </div>
          <Input
            label={t('companyMembers.labelEmail')}
            name="email"
            type="email"
            value={createForm.values.email}
            onChange={createForm.handleChange}
            error={createForm.errors.email}
            required
            placeholder={t('companyMembers.emailPlaceholder')}
          />
          <Input
            label={t('companyMembers.labelPassword')}
            name="password"
            type="password"
            value={createForm.values.password}
            onChange={createForm.handleChange}
            error={createForm.errors.password}
            required
            placeholder={t('companyMembers.passwordPlaceholder')}
          />
          <Select
            label={t('companyMembers.labelRole')}
            name="role_in_company"
            value={createForm.values.role_in_company}
            onChange={createForm.handleChange}
            options={ROLE_OPTIONS}
          />
        </form>
      </Modal>

      <Modal
        open={modal && modal !== 'create'}
        onClose={() => setModal(null)}
        title={t('companyMembers.editModalTitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)} disabled={submitting}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleEdit} loading={submitting}>{t('common.saveChanges')}</Button>
          </>
        }
      >
        <form onSubmit={handleEdit} className="space-y-4 max-w-sm mx-auto">
          <Input
            label={t('companyMembers.labelFirstName')}
            name="first_name"
            value={editForm.values.first_name}
            onChange={editForm.handleChange}
            error={editForm.errors.first_name}
            required
          />
          <Input
            label={t('companyMembers.labelLastName')}
            name="last_name"
            value={editForm.values.last_name}
            onChange={editForm.handleChange}
            error={editForm.errors.last_name}
            required
          />
          <Select
            label={t('companyMembers.labelRole')}
            name="role_in_company"
            value={editForm.values.role_in_company}
            onChange={editForm.handleChange}
            options={ROLE_OPTIONS}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDelete(null)}
        onConfirm={handleDelete}
        loading={submitting}
        title={t('companyMembers.removeTitle')}
        message={t('companyMembers.removeMessage', { name: deleteTarget?.full_name })}
        confirmLabel={t('companyMembers.removeButton')}
      />
    </div>
  );
}
