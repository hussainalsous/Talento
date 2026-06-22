import { useState, useCallback, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { companyApi } from '../../api/companyApi';
import { useFetch } from '../../hooks/useFetch';
import { useForm } from '../../hooks/useForm';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { formatDate, extractPagination } from '../../utils/formatters';
import toast from 'react-hot-toast';

export function CompanyInvitationsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [page,    setPage]    = useState(1);
  const [modal,   setModal]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validate = (v) => {
    const e = {};
    if (!v.job_seeker_id) e.job_seeker_id = t('companyInvitations.validJobSeekerRequired');
    else if (isNaN(Number(v.job_seeker_id))) e.job_seeker_id = t('companyInvitations.validJobSeekerNumeric');
    return e;
  };

  const fetchFn = useCallback(() => companyApi.getInvitations({ page }), [page]);
  const { data, loading, error, refetch } = useFetch(fetchFn, { deps: [page] });
  const { data: rows, pagination } = extractPagination(data);

  const { values, errors, handleChange, isValid, setServerErrors, reset, setValues } = useForm(
    { job_seeker_id: '', job_post_id: '', message: '' },
    validate,
  );

  useEffect(() => {
    if (location.state?.candidateId) {
      setValues((prev) => ({ ...prev, job_seeker_id: String(location.state.candidateId) }));
      setModal(true);
    }
  }, [location.state?.candidateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!isValid()) return;
    setSubmitting(true);
    try {
      await companyApi.createInvitation({
        job_seeker_id: Number(values.job_seeker_id),
        job_post_id:   values.job_post_id ? Number(values.job_post_id) : undefined,
        message:       values.message || undefined,
      });
      toast.success(t('companyInvitations.sentToast'));
      setModal(false);
      reset();
      refetch();
    } catch (err) {
      if (err?.errors) setServerErrors(err.errors);
      else toast.error(err?.message || t('companyInvitations.failedToast'));
    } finally { setSubmitting(false); }
  };

  const columns = [
    {
      key: 'candidate', label: t('companyInvitations.colCandidate'),
      render: (v) => (
        <div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {v?.full_name || v?.name || '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{v?.email || ''}</p>
        </div>
      ),
    },
    { key: 'job_post',     label: t('companyInvitations.colPosition'),  render: (v) => v?.title || '—' },
    { key: 'status',       label: t('companyInvitations.colStatus'),    render: (v) => <Badge status={v ?? 'pending'}>{v ?? 'pending'}</Badge> },
    { key: 'created_at',   label: t('companyInvitations.colSent'),      render: (v) => formatDate(v) },
    { key: 'responded_at', label: t('companyInvitations.colResponded'), render: (v) => formatDate(v) },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('companyInvitations.title')}
        subtitle={t('companyInvitations.subtitle')}
        breadcrumbs={[{ label: t('companyDashboard.breadCompany') }, { label: t('companyInvitations.breadInvitations') }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus size={15} />} onClick={() => setModal(true)}>
            {t('companyInvitations.sendButton')}
          </Button>
        }
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
          emptyTitle={t('companyInvitations.emptyTitle')}
          emptyDescription={t('companyInvitations.emptyDesc')}
          emptyAction={<Button variant="primary" size="sm" onClick={() => setModal(true)}>{t('companyInvitations.sendButton')}</Button>}
        />
      </div>

      <Modal
        open={modal}
        onClose={() => { setModal(false); reset(); }}
        title={t('companyInvitations.sendModalTitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setModal(false); reset(); }} disabled={submitting}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleSend} loading={submitting}>{t('companyInvitations.sendInvitationButton')}</Button>
          </>
        }
      >
        <form onSubmit={handleSend} className="space-y-4">
          <Input
            label={t('companyInvitations.labelJobSeekerId')}
            name="job_seeker_id"
            type="number"
            value={values.job_seeker_id}
            onChange={handleChange}
            error={errors.job_seeker_id}
            required
            placeholder={t('companyInvitations.jobSeekerIdPlaceholder')}
            hint={t('companyInvitations.jobSeekerIdHint')}
          />
          <Input
            label={t('companyInvitations.labelJobPostId')}
            name="job_post_id"
            type="number"
            value={values.job_post_id}
            onChange={handleChange}
            placeholder={t('companyInvitations.jobPostIdPlaceholder')}
          />
          <Textarea
            label={t('companyInvitations.labelMessage')}
            name="message"
            value={values.message}
            onChange={handleChange}
            rows={3}
            placeholder={t('companyInvitations.messagePlaceholder')}
          />
        </form>
      </Modal>
    </div>
  );
}
