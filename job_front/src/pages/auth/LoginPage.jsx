import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../app/useAuthStore';
import { Input }  from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useForm } from '../../hooks/useForm';
import toast from 'react-hot-toast';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [showPwd, setShowPwd] = useState(false);

  const validate = (values) => {
    const errors = {};
    if (!values.email)               errors.email    = t('auth.validation.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(values.email)) errors.email = t('auth.validation.emailInvalid');
    if (!values.password)            errors.password = t('auth.validation.passwordRequired');
    else if (values.password.length < 6) errors.password = t('auth.validation.passwordMin6');
    return errors;
  };

  const { values, errors, handleChange, handleBlur, isValid, setServerErrors } = useForm(
    { email: '', password: '', remember: false },
    validate,
  );

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid()) return;

    setSubmitting(true);
    const result = await login({ email: values.email, password: values.password });
    setSubmitting(false);

    if (result.success) {
      toast.success(t('auth.login.welcomeBack'));
      const role = result.user?.role;
      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else if (role === 'admin' || role === 'super_admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 'job_seeker') {
        navigate('/job-seeker/profile', { replace: true });
      } else {
        navigate('/company/dashboard', { replace: true });
      }
    } else {
      if (result.error?.errors) {
        setServerErrors(result.error.errors);
      } else {
        toast.error(result.error?.message || t('auth.login.loginFailed'));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('auth.login.title')}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {t('auth.login.subtitle')}
        </p>
      </div>

      <Input
        label={t('auth.login.email')}
        type="email"
        name="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.email}
        placeholder={t('auth.login.emailPlaceholder')}
        autoComplete="email"
        required
        leftElement={<Mail size={16} />}
      />

      <Input
        label={t('auth.login.password')}
        type={showPwd ? 'text' : 'password'}
        name="password"
        value={values.password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.password}
        placeholder={t('auth.login.passwordPlaceholder')}
        autoComplete="current-password"
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

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="remember"
            checked={values.remember}
            onChange={handleChange}
            className="rounded"
            style={{ accentColor: 'var(--primary)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('auth.login.rememberMe')}
          </span>
        </label>
        <Link
          to="/forgot-password"
          className="text-sm font-medium"
          style={{ color: 'var(--primary)' }}
        >
          {t('auth.login.forgotPassword')}
        </Link>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={submitting}
        className="w-full"
      >
        {t('auth.login.submit')}
      </Button>
    </form>
  );
}
