import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, XCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input }  from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useForm } from '../../hooks/useForm';
import { authApi } from '../../api/authApi';
import toast from 'react-hot-toast';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const hasParams = !!(token && email);

  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = (values) => {
    const errors = {};
    if (!values.password)
      errors.password = t('auth.resetPassword.validPasswordRequired');
    else if (values.password.length < 8)
      errors.password = t('auth.resetPassword.validPasswordMin');
    if (!values.confirm)
      errors.confirm = t('auth.resetPassword.validConfirmRequired');
    else if (values.confirm !== values.password)
      errors.confirm = t('auth.resetPassword.validConfirmMismatch');
    return errors;
  };

  const { values, errors, handleChange, handleBlur, isValid, setServerErrors } = useForm(
    { password: '', confirm: '' },
    validate,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid()) return;

    setSubmitting(true);
    try {
      await authApi.resetPassword({
        token,
        email,
        password: values.password,
        password_confirmation: values.confirm,
      });
      setSucceeded(true);
    } catch (err) {
      if (err?.status === 422) {
        const errs = err?.errors ?? {};
        if (errs.email) {
          setLinkError(t('auth.resetPassword.linkExpired'));
        } else {
          setServerErrors(errs);
        }
      } else if (err?.status === 429) {
        toast.error(t('auth.resetPassword.throttled'));
      } else {
        toast.error(err?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasParams || linkError) {
    return (
      <div className="text-center space-y-5">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-red-50">
          <XCircle size={24} style={{ color: '#dc2626' }} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('auth.resetPassword.invalidLink')}
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            {linkError || t('auth.resetPassword.invalidLinkMessage')}
          </p>
        </div>
        <Link
          to="/forgot-password"
          className="block text-sm font-semibold"
          style={{ color: 'var(--primary)' }}
        >
          {t('auth.resetPassword.requestNew')}
        </Link>
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-sm font-medium"
          style={{ color: 'var(--primary)' }}
        >
          <ArrowLeft size={14} /> {t('auth.resetPassword.backToLogin')}
        </Link>
      </div>
    );
  }

  if (succeeded) {
    return (
      <div className="text-center space-y-5">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-green-50">
          <CheckCircle size={24} style={{ color: '#16a34a' }} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('auth.resetPassword.successTitle')}
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            {t('auth.resetPassword.successMessage')}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/login', { replace: true })}
        >
          {t('auth.resetPassword.backToLogin')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('auth.resetPassword.title')}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {t('auth.resetPassword.subtitle')}
        </p>
      </div>

      <Input
        label={t('auth.resetPassword.passwordLabel')}
        type={showPwd ? 'text' : 'password'}
        name="password"
        value={values.password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.password}
        placeholder={t('auth.resetPassword.passwordPlaceholder')}
        autoComplete="new-password"
        required
        leftElement={<Lock size={16} />}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            style={{ color: 'var(--text-muted)', cursor: 'pointer', pointerEvents: 'auto' }}
          >
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />

      <Input
        label={t('auth.resetPassword.confirmLabel')}
        type={showConfirm ? 'text' : 'password'}
        name="confirm"
        value={values.confirm}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.confirm}
        placeholder={t('auth.resetPassword.confirmPlaceholder')}
        autoComplete="new-password"
        required
        leftElement={<Lock size={16} />}
        rightElement={
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            style={{ color: 'var(--text-muted)', cursor: 'pointer', pointerEvents: 'auto' }}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={submitting}
        className="w-full"
      >
        {t('auth.resetPassword.submit')}
      </Button>

      <Link
        to="/login"
        className="flex items-center justify-center gap-2 text-sm font-medium"
        style={{ color: 'var(--primary)' }}
      >
        <ArrowLeft size={14} /> {t('auth.resetPassword.backToLogin')}
      </Link>
    </form>
  );
}
