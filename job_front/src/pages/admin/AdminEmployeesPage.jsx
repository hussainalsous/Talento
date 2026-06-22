import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/adminApi';
import { useForm } from '../../hooks/useForm';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

export function AdminEmployeesPage() {
  const { t } = useTranslation();
  const [createModal, setCreate]    = useState(false);
  const [submitting,  setSubmitting] = useState(false);

  const validate = (v) => {
    const e = {};
    if (!v.first_name) e.first_name = t('adminEmployees.validFirstName');
    if (!v.last_name)  e.last_name  = t('adminEmployees.validLastName');
    if (!v.email)      e.email      = t('adminEmployees.validEmail');
    if (!v.password)   e.password   = t('adminEmployees.validPassword');
    else if (v.password.length < 8) e.password = t('adminEmployees.validPasswordMin');
    return e;
  };

  const { values, errors, handleChange, isValid, setServerErrors, reset } = useForm(
    { first_name: '', last_name: '', email: '', password: '' },
    validate,
  );

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (!isValid()) return;
    setSubmitting(true);
    try {
      await adminApi.createSystemEmployee(values);
      toast.success(t('adminEmployees.createdToast'));
      setCreate(false);
      reset();
    } catch (err) {
      if (err?.errors) setServerErrors(err.errors);
      else toast.error(err?.message || t('adminEmployees.failedToast'));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('adminEmployees.title')}
        subtitle={t('adminEmployees.subtitle')}
        breadcrumbs={[{ label: t('adminDashboard.breadAdmin') }, { label: t('adminEmployees.breadEmployees') }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus size={15} />} onClick={() => setCreate(true)}>
            {t('adminEmployees.addButton')}
          </Button>
        }
      />

      <div
        className="rounded-xl px-4 py-3 flex items-start gap-3 text-sm"
        style={{ background: 'var(--status-info-bg)', border: '1px solid var(--status-info-text)', color: 'var(--status-info-text)' }}
      >
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>
          Admin users appear in the <Link to="/admin/users" className="underline font-semibold">{t('adminEmployees.usersPageLink')}</Link> with
          the <strong>admin</strong> role. Use the filter there to browse all administrators.
          Use this page to create new admin accounts.
        </span>
      </div>

      <Modal
        open={createModal}
        onClose={() => { setCreate(false); reset(); }}
        title={t('adminEmployees.addModalTitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCreate(false); reset(); }} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={submitting}>
              {t('adminEmployees.createButton')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('adminEmployees.labelFirstName')}
              name="first_name"
              value={values.first_name}
              onChange={handleChange}
              error={errors.first_name}
              required
              placeholder={t('adminEmployees.firstNamePlaceholder')}
            />
            <Input
              label={t('adminEmployees.labelLastName')}
              name="last_name"
              value={values.last_name}
              onChange={handleChange}
              error={errors.last_name}
              required
              placeholder={t('adminEmployees.lastNamePlaceholder')}
            />
          </div>
          <Input
            label={t('adminEmployees.labelEmail')}
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            error={errors.email}
            required
            placeholder={t('adminEmployees.emailPlaceholder')}
          />
          <Input
            label={t('adminEmployees.labelPassword')}
            name="password"
            type="password"
            value={values.password}
            onChange={handleChange}
            error={errors.password}
            required
            placeholder={t('adminEmployees.passwordPlaceholder')}
          />
        </form>
      </Modal>
    </div>
  );
}
