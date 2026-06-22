import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/authApi';
import { useAuthStore, getUserDisplayName } from '../../app/useAuthStore';
import { useForm } from '../../hooks/useForm';
import { PageHeader } from '../../components/layout/PageHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { humanizeRole } from '../../utils/formatters';
import toast from 'react-hot-toast';

export function AdminSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const displayName = getUserDisplayName(user);

  const validatePassword = (v) => {
    const e = {};
    if (!v.current_password)         e.current_password = t('adminSettings.validCurrentRequired');
    if (!v.password)                 e.password         = t('adminSettings.validNewRequired');
    else if (v.password.length < 8)  e.password         = t('adminSettings.validNewMin');
    if (v.password !== v.password_confirmation) e.password_confirmation = t('adminSettings.validConfirmMismatch');
    return e;
  };

  const passwordForm = useForm(
    { current_password: '', password: '', password_confirmation: '' },
    validatePassword,
  );

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!passwordForm.isValid()) return;
    setSubmitting(true);
    try {
      await authApi.changePassword(passwordForm.values);
      toast.success(t('adminSettings.successToast'));
      passwordForm.reset();
    } catch (err) {
      if (err?.errors) passwordForm.setServerErrors(err.errors);
      else toast.error(err?.message || t('adminSettings.failedToast'));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('adminSettings.title')}
        subtitle={t('adminSettings.subtitle')}
        breadcrumbs={[{ label: t('adminDashboard.breadAdmin') }, { label: t('adminSettings.breadSettings') }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 flex flex-col items-center gap-3">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
          >
            {(displayName || user?.email)?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="text-center">
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            <p className="text-xs mt-1 capitalize px-3 py-1 rounded-full inline-block"
               style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              {humanizeRole(user?.role)}
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSave} className="card p-6 lg:col-span-2 space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('adminSettings.changePassword')}</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('adminSettings.changePasswordDesc')}</p>
          <Input
            label={t('adminSettings.currentPassword')}
            name="current_password"
            type="password"
            value={passwordForm.values.current_password}
            onChange={passwordForm.handleChange}
            error={passwordForm.errors.current_password}
            required
            leftElement={<Lock size={16} />}
          />
          <Input
            label={t('adminSettings.newPassword')}
            name="password"
            type="password"
            value={passwordForm.values.password}
            onChange={passwordForm.handleChange}
            error={passwordForm.errors.password}
            required
            placeholder={t('adminSettings.passwordPlaceholder')}
          />
          <Input
            label={t('adminSettings.confirmNewPassword')}
            name="password_confirmation"
            type="password"
            value={passwordForm.values.password_confirmation}
            onChange={passwordForm.handleChange}
            error={passwordForm.errors.password_confirmation}
            required
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={submitting}>
              {t('adminSettings.changePasswordButton')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
