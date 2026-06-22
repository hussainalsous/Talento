import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input }  from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useForm } from '../../hooks/useForm';
import { authApi } from '../../api/authApi';
import toast from 'react-hot-toast';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = (values) => {
    const errors = {};
    if (!values.email)
      errors.email = t('auth.forgotPassword.validEmailRequired');
    else if (!/\S+@\S+\.\S+/.test(values.email))
      errors.email = t('auth.forgotPassword.validEmailInvalid');
    return errors;
  };

  const { values, errors, handleChange, handleBlur, isValid } = useForm(
    { email: '' },
    validate,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid()) return;

    setSubmitting(true);
    try {
      await authApi.forgotPassword({ email: values.email });
      setSubmitted(true);
    } catch (err) {
      if (err?.status === 429) {
        toast.error(t('auth.forgotPassword.throttled'));
      } else {
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center space-y-5">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-green-50">
          <CheckCircle size={24} style={{ color: '#16a34a' }} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('auth.forgotPassword.successTitle')}
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            {t('auth.forgotPassword.successMessage')}
          </p>
        </div>
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-sm font-medium"
          style={{ color: 'var(--primary)' }}
        >
          <ArrowLeft size={14} /> {t('auth.forgotPassword.backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('auth.forgotPassword.title')}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {t('auth.forgotPassword.subtitle')}
        </p>
      </div>

      <Input
        label={t('auth.forgotPassword.emailLabel')}
        type="email"
        name="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.email}
        placeholder={t('auth.forgotPassword.emailPlaceholder')}
        autoComplete="email"
        required
        leftElement={<Mail size={16} />}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={submitting}
        className="w-full"
      >
        {t('auth.forgotPassword.submit')}
      </Button>

      <Link
        to="/login"
        className="flex items-center justify-center gap-2 text-sm font-medium"
        style={{ color: 'var(--primary)' }}
      >
        <ArrowLeft size={14} /> {t('auth.forgotPassword.backToLogin')}
      </Link>
    </form>
  );
}
