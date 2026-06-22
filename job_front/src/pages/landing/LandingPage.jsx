import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Building2, ArrowRight, CheckCircle, Briefcase,
  Search, Users, ChevronDown, Sun, Moon, Sparkles,
  Star, TrendingUp, Zap, Award, Globe, Shield,
} from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { registerJobSeeker, submitCompanyRegistration } from '../../services/authService';
import { useAuthStore } from '../../app/useAuthStore';
import toast from 'react-hot-toast';

/* ─── Scroll detection ───────────────────────────────────────── */
function useScrolled(threshold = 72) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => window.removeEventListener('scroll', fn);
  }, [threshold]);
  return scrolled;
}

/* ─── Theme hook ─────────────────────────────────────────────── */
function useTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'light',
  );
  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    setTheme(next);
  };
  return [theme, toggle];
}


/* ─── Animation variants ─────────────────────────────────────── */
const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.2 } },
};
const heroItem = {
  hidden:  { opacity: 0, y: 36, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.72, ease: [0.16, 1, 0.3, 1] } },
};
const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
};

/* ─── Ambient glow orb ───────────────────────────────────────── */
function GlowOrb({ style, duration = 8, delay = 0 }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ filter: 'blur(72px)', ...style }}
      animate={{ y: [0, -32, 0], x: [0, 14, 0], scale: [1, 1.08, 1] }}
      transition={{ duration, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

/* ─── Talento logo mark ──────────────────────────────────────── */
function TalentoLogo() {
  return (
    <motion.div
      className="flex items-center gap-2.5 cursor-pointer select-none"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      whileHover="hovered"
    >
      {/* Icon mark */}
      <motion.div
        variants={{ hovered: { scale: 1.1, boxShadow: '0 0 28px rgba(16,185,129,0.55)' } }}
        style={{
          width: 38, height: 38, borderRadius: '11px',
          background: 'linear-gradient(135deg,#10b981 0%,#059669 100%)',
          boxShadow: '0 4px 18px rgba(16,185,129,0.38)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'box-shadow 0.3s ease',
        }}
      >
        {/* T letterform */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3.5 5.5h13M10 5.5v9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>

      {/* Wordmark */}
      <motion.span
        variants={{
          hovered: { letterSpacing: '-0.02em' },
        }}
        style={{
          fontWeight: 800,
          fontSize: '1.3rem',
          letterSpacing: '-0.04em',
          background: 'linear-gradient(130deg,#ffffff 30%,#a7f3d0 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1,
          transition: 'letter-spacing 0.25s ease',
        }}
      >
        Talento
      </motion.span>
    </motion.div>
  );
}

/* ─── Language switch (segmented control) ───────────────────── */
function LangSwitch({ lang, onToggle }) {
  return (
    <motion.button
      onClick={onToggle}
      aria-label="Toggle language"
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: '24px',
        padding: '3px',
        cursor: 'pointer',
        overflow: 'hidden',
        gap: 0,
      }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
    >
      {/* Sliding pill */}
      <motion.div
        style={{
          position: 'absolute',
          top: '3px',
          bottom: '3px',
          width: 'calc(50% - 3px)',
          borderRadius: '20px',
          background: 'linear-gradient(135deg,rgba(16,185,129,0.32),rgba(5,150,105,0.28))',
          border: '1px solid rgba(16,185,129,0.35)',
        }}
        animate={{ left: lang === 'en' ? '3px' : 'calc(50%)' }}
        transition={{ type: 'spring', stiffness: 480, damping: 32 }}
      />
      {['EN', 'AR'].map((opt) => (
        <span
          key={opt}
          style={{
            position: 'relative', zIndex: 1,
            padding: '5px 13px',
            fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.05em',
            color: lang.toUpperCase() === opt ? '#6ee7b7' : 'rgba(255,255,255,0.38)',
            transition: 'color 0.22s ease',
            userSelect: 'none',
            lineHeight: 1,
          }}
        >
          {opt}
        </span>
      ))}
    </motion.button>
  );
}

/* ─── Navbar action button ───────────────────────────────────── */
function NavbarButton({ onClick, children, variant = 'ghost', icon }) {
  const styles = {
    ghost: {
      bg: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.14)',
      color: 'rgba(255,255,255,0.82)',
      hoverBg: 'rgba(255,255,255,0.12)',
      hoverShadow: 'none',
    },
    primary: {
      bg: 'linear-gradient(135deg,#10b981 0%,#059669 100%)',
      border: 'none',
      color: '#fff',
      hoverBg: null,
      hoverShadow: '0 6px 24px rgba(16,185,129,0.5)',
    },
    outline: {
      bg: 'rgba(52,211,153,0.05)',
      border: '1px solid rgba(52,211,153,0.32)',
      color: '#6ee7b7',
      hoverBg: 'rgba(52,211,153,0.14)',
      hoverShadow: 'none',
    },
  };
  const s = styles[variant];
  return (
    <motion.button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '8px 16px', borderRadius: '10px',
        fontWeight: '650', fontSize: '0.82rem', letterSpacing: '0.005em',
        cursor: 'pointer', whiteSpace: 'nowrap',
        background: s.bg, border: s.border, color: s.color,
        backdropFilter: 'blur(8px)',
      }}
      whileHover={{ scale: 1.04, y: -1, background: s.hoverBg || s.bg, boxShadow: s.hoverShadow }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
    >
      {icon && icon}
      {children}
    </motion.button>
  );
}

/* ─── Fixed Navbar ───────────────────────────────────────────── */
function Navbar({ scrolled, lang, onToggleLang, theme, onToggleTheme, onSelectRole, onLogin }) {
  const { t } = useTranslation();
  return (
    <motion.nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled
          ? 'rgba(2,13,8,0.88)'
          : 'linear-gradient(to bottom,rgba(0,0,0,0.38) 0%,transparent 100%)',
        backdropFilter: scrolled ? 'blur(22px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(22px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
        transition: 'background 0.45s ease, backdrop-filter 0.45s ease, border-color 0.45s ease',
      }}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{
        maxWidth: '1280px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 40px',
        gap: '16px',
      }}>
        {/* Logo */}
        <TalentoLogo />

        {/* Right-side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Language switch */}
          <LangSwitch lang={lang} onToggle={onToggleLang} />

          {/* Theme toggle */}
          <motion.button
            onClick={onToggleTheme}
            style={{
              width: 36, height: 36, borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.11)',
              color: 'rgba(255,255,255,0.65)',
              cursor: 'pointer', flexShrink: 0,
            }}
            whileHover={{ background: 'rgba(255,255,255,0.13)', scale: 1.08, color: '#fff' }}
            whileTap={{ scale: 0.9 }}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </motion.button>

          {/* Sign in */}
          <NavbarButton onClick={onLogin} variant="ghost">
            {t('nav.signIn')}
          </NavbarButton>

          {/* Job Seeker — hidden on very small screens */}
          <div className="hidden sm:block">
            <NavbarButton onClick={() => onSelectRole('seeker')} variant="outline" icon={<User size={14} />}>
              {t('nav.jobSeeker')}
            </NavbarButton>
          </div>

          {/* Register Company */}
          <NavbarButton onClick={() => onSelectRole('company')} variant="primary" icon={<Building2 size={14} />}>
            <span className="hidden md:inline">{t('nav.registerCompany')}</span>
            <span className="inline md:hidden">{t('nav.registerCompany')}</span>
          </NavbarButton>
        </div>
      </div>
    </motion.nav>
  );
}

/* ─── Shimmer CTA button ─────────────────────────────────────── */
function ShimmerButton({ onClick, children, variant = 'primary', className = '', style = {} }) {
  const [hovered, setHovered] = useState(false);
  const isPrimary = variant === 'primary';
  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={className}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '15px 32px', borderRadius: '14px',
        fontWeight: '700', fontSize: '15px', cursor: 'pointer',
        background: isPrimary ? 'linear-gradient(135deg,#ffffff 0%,#f0fdf4 100%)' : 'rgba(255,255,255,0.08)',
        color: isPrimary ? '#064e3b' : '#ffffff',
        border: isPrimary ? 'none' : '1px solid rgba(255,255,255,0.18)',
        backdropFilter: isPrimary ? 'none' : 'blur(16px)',
        boxShadow: isPrimary
          ? (hovered ? '0 12px 40px rgba(255,255,255,0.25),0 4px 16px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.2)')
          : (hovered ? '0 8px 32px rgba(52,211,153,0.15),inset 0 1px 0 rgba(255,255,255,0.12)' : 'none'),
        transition: 'box-shadow 0.25s ease',
        ...style,
      }}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 20 }}
    >
      <AnimatePresence>
        {hovered && isPrimary && (
          <motion.span
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.55) 50%,transparent 70%)',
              borderRadius: '14px',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>
      {children}
    </motion.button>
  );
}

/* ─── Form field wrapper ─────────────────────────────────────── */
function Field({ label, error, required, children }) {
  return (
    <div className="space-y-1.5">
      <label
        className="block text-xs font-bold uppercase tracking-wide"
        style={{ color: 'var(--text-secondary)', letterSpacing: '0.04em' }}
      >
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            className="text-xs flex items-center gap-1"
            style={{ color: 'var(--clr-danger-a10)' }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            ⚠ {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function TextInput({ error, ...props }) {
  return (
    <motion.input
      className="w-full rounded-xl text-sm outline-none"
      style={{
        padding: '11px 16px',
        background: 'var(--bg-input,var(--bg-page))',
        border: `1.5px solid ${error ? 'var(--clr-danger-a10)' : 'var(--border-default)'}`,
        color: 'var(--text-primary)',
        transition: 'border-color 0.18s, box-shadow 0.18s',
      }}
      whileFocus={{ scale: 1.004 }}
      onFocus={(e) => {
        e.target.style.borderColor = '#10b981';
        e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = error ? 'var(--clr-danger-a10)' : 'var(--border-default)';
        e.target.style.boxShadow = 'none';
      }}
      {...props}
    />
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

/* ─── Success state ──────────────────────────────────────────── */
function SuccessState({ title, message, onBack, bgVar, iconColorVar }) {
  const { t } = useTranslation();
  return (
    <motion.div
      className="text-center space-y-5 py-12"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <motion.div
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
        style={{ background: bgVar }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <CheckCircle size={36} style={{ color: iconColorVar }} />
        </motion.div>
      </motion.div>
      <motion.h3
        className="text-2xl font-bold"
        style={{ color: 'var(--text-primary)' }}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
      >
        {title}
      </motion.h3>
      <motion.p
        className="text-sm max-w-sm mx-auto leading-relaxed"
        style={{ color: 'var(--text-muted)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
      >
        {message}
      </motion.p>
      <motion.button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl"
        style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', cursor: 'pointer' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
        whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }}
      >
        ← {t('landing.backHome')}
      </motion.button>
    </motion.div>
  );
}

/* ─── Job Seeker Registration Form ──────────────────────────── */
function JobSeekerForm({ onBack, onSuccess }) {
  const { t } = useTranslation();
  const [values,  setValues]  = useState({ first_name: '', last_name: '', email: '', password: '', password_confirmation: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!values.first_name)                        e.first_name = t('forms.jobSeeker.validFirstName');
    if (!values.last_name)                         e.last_name  = t('forms.jobSeeker.validLastName');
    if (!values.email)                             e.email = t('forms.jobSeeker.validEmail');
    else if (!/\S+@\S+\.\S+/.test(values.email))  e.email = t('forms.jobSeeker.validEmailInvalid');
    if (!values.password)                          e.password = t('forms.jobSeeker.validPassword');
    else if (values.password.length < 8)           e.password = t('forms.jobSeeker.validPasswordMin');
    if (values.password !== values.password_confirmation) e.password_confirmation = t('forms.jobSeeker.validConfirmMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await registerJobSeeker(values);
      onSuccess?.(result);
    } catch (err) {
      if (err?.errors) setErrors(err.errors);
      else toast.error(err?.message || t('forms.jobSeeker.validFirstName'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('forms.jobSeeker.firstName')} error={errors.first_name} required>
          <TextInput name="first_name" value={values.first_name} onChange={set('first_name')} placeholder={t('forms.jobSeeker.firstNamePlaceholder')} error={errors.first_name} />
        </Field>
        <Field label={t('forms.jobSeeker.lastName')} error={errors.last_name} required>
          <TextInput name="last_name" value={values.last_name} onChange={set('last_name')} placeholder={t('forms.jobSeeker.lastNamePlaceholder')} error={errors.last_name} />
        </Field>
      </motion.div>
      <motion.div variants={fadeUp}>
        <Field label={t('forms.jobSeeker.email')} error={errors.email} required>
          <TextInput name="email" type="email" value={values.email} onChange={set('email')} placeholder={t('forms.jobSeeker.emailPlaceholder')} error={errors.email} />
        </Field>
      </motion.div>
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('forms.jobSeeker.password')} error={errors.password} required>
          <TextInput name="password" type="password" value={values.password} onChange={set('password')} placeholder={t('forms.jobSeeker.passwordPlaceholder')} error={errors.password} />
        </Field>
        <Field label={t('forms.jobSeeker.confirmPassword')} error={errors.password_confirmation} required>
          <TextInput name="password_confirmation" type="password" value={values.password_confirmation} onChange={set('password_confirmation')} placeholder={t('forms.jobSeeker.confirmPasswordPlaceholder')} error={errors.password_confirmation} />
        </Field>
      </motion.div>
      <motion.div variants={fadeUp}>
        <motion.button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5"
          style={{
            background: 'linear-gradient(135deg,#059669 0%,#10b981 50%,#34d399 100%)',
            color: '#fff', border: 'none', cursor: 'pointer',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(16,185,129,0.35)',
            opacity: loading ? 0.75 : 1,
          }}
          whileHover={!loading ? { scale: 1.015, boxShadow: '0 8px 32px rgba(16,185,129,0.45)' } : {}}
          whileTap={!loading ? { scale: 0.97 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {loading ? <><Spinner /> {t('common.loading')}</> : <>{t('forms.jobSeeker.submit')} <ArrowRight size={16} /></>}
        </motion.button>
      </motion.div>
    </motion.form>
  );
}

/* ─── Company Registration Form ─────────────────────────────── */
function CompanyForm({ onBack }) {
  const { t } = useTranslation();
  const EMPTY = {
    company_name: '', registration_number: '', website: '', address: '',
    country: '', description: '', requester_first_name: '', requester_last_name: '',
    requester_email: '', requester_phone: '', password: '', password_confirmation: '',
  };
  const [values,    setValues]    = useState(EMPTY);
  const [errors,    setErrors]    = useState({});
  const [loading,   setLoading]   = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!values.company_name)          e.company_name         = t('forms.company.validCompanyName');
    if (!values.registration_number)   e.registration_number  = t('forms.company.validRegNumber');
    if (!values.country)               e.country              = t('forms.company.validCountry');
    if (!values.requester_first_name)  e.requester_first_name = t('forms.company.validFirstName');
    if (!values.requester_last_name)   e.requester_last_name  = t('forms.company.validLastName');
    if (!values.requester_email)       e.requester_email      = t('forms.company.validEmail');
    else if (!/\S+@\S+\.\S+/.test(values.requester_email)) e.requester_email = t('forms.company.validEmailInvalid');
    if (!values.password)              e.password             = t('forms.company.validPassword');
    else if (values.password.length < 8) e.password           = t('forms.company.validPasswordMin');
    if (values.password !== values.password_confirmation) e.password_confirmation = t('forms.company.validConfirmMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await submitCompanyRegistration(values);
      setSucceeded(true);
    } catch (err) {
      if (err?.errors) setErrors(err.errors);
      else toast.error(err?.message || t('errors.generic.title'));
    } finally {
      setLoading(false);
    }
  };

  if (succeeded) return (
    <SuccessState
      title={t('forms.company.successTitle')}
      onBack={onBack}
      message={t('forms.company.successMessage')}
      bgVar="var(--status-pending-bg)"
      iconColorVar="var(--status-pending-text)"
    />
  );

  const SectionDivider = ({ label }) => (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--primary)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
    </div>
  );

  const sv = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };

  return (
    <motion.form onSubmit={handleSubmit} className="space-y-6" noValidate initial="hidden" animate="visible" variants={sv}>
      <motion.div variants={fadeUp}>
        <SectionDivider label={t('forms.company.sectionCompanyDetails')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('forms.company.companyName')} error={errors.company_name} required>
            <TextInput value={values.company_name} onChange={set('company_name')} placeholder={t('forms.company.companyNamePlaceholder')} error={errors.company_name} />
          </Field>
          <Field label={t('forms.company.registrationNumber')} error={errors.registration_number} required>
            <TextInput value={values.registration_number} onChange={set('registration_number')} placeholder={t('forms.company.registrationNumberPlaceholder')} error={errors.registration_number} />
          </Field>
          <Field label={t('forms.company.website')} error={errors.website}>
            <TextInput type="url" value={values.website} onChange={set('website')} placeholder={t('forms.company.websitePlaceholder')} />
          </Field>
          <Field label={t('forms.company.country')} error={errors.country} required>
            <TextInput value={values.country} onChange={set('country')} placeholder={t('forms.company.countryPlaceholder')} error={errors.country} />
          </Field>
          <Field label={t('forms.company.address')} error={errors.address}>
            <TextInput value={values.address} onChange={set('address')} placeholder={t('forms.company.addressPlaceholder')} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label={t('forms.company.description')} error={errors.description}>
            <textarea
              rows={3}
              value={values.description}
              onChange={set('description')}
              placeholder={t('forms.company.descriptionPlaceholder')}
              className="w-full rounded-xl text-sm outline-none resize-none"
              style={{
                padding: '11px 16px',
                background: 'var(--bg-input,var(--bg-page))',
                border: '1.5px solid var(--border-default)',
                color: 'var(--text-primary)',
                transition: 'border-color 0.18s, box-shadow 0.18s',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none'; }}
            />
          </Field>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <SectionDivider label={t('forms.company.sectionContactInfo')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('forms.company.firstName')} error={errors.requester_first_name} required>
            <TextInput value={values.requester_first_name} onChange={set('requester_first_name')} placeholder={t('forms.company.firstNamePlaceholder')} error={errors.requester_first_name} />
          </Field>
          <Field label={t('forms.company.lastName')} error={errors.requester_last_name} required>
            <TextInput value={values.requester_last_name} onChange={set('requester_last_name')} placeholder={t('forms.company.lastNamePlaceholder')} error={errors.requester_last_name} />
          </Field>
          <Field label={t('forms.company.workEmail')} error={errors.requester_email} required>
            <TextInput type="email" value={values.requester_email} onChange={set('requester_email')} placeholder={t('forms.company.emailPlaceholder')} error={errors.requester_email} />
          </Field>
          <Field label={t('forms.company.phone')} error={errors.requester_phone}>
            <TextInput type="tel" value={values.requester_phone} onChange={set('requester_phone')} placeholder={t('forms.company.phonePlaceholder')} />
          </Field>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <SectionDivider label={t('forms.company.sectionAccountSecurity')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('forms.company.password')} error={errors.password} required>
            <TextInput type="password" value={values.password} onChange={set('password')} placeholder={t('forms.company.passwordPlaceholder')} error={errors.password} />
          </Field>
          <Field label={t('forms.company.confirmPassword')} error={errors.password_confirmation} required>
            <TextInput type="password" value={values.password_confirmation} onChange={set('password_confirmation')} placeholder={t('forms.company.confirmPasswordPlaceholder')} error={errors.password_confirmation} />
          </Field>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <motion.button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5"
          style={{
            background: 'linear-gradient(135deg,#059669 0%,#10b981 50%,#34d399 100%)',
            color: '#fff', border: 'none', cursor: 'pointer',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(16,185,129,0.35)',
            opacity: loading ? 0.75 : 1,
          }}
          whileHover={!loading ? { scale: 1.015, boxShadow: '0 8px 32px rgba(16,185,129,0.45)' } : {}}
          whileTap={!loading ? { scale: 0.97 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {loading ? <><Spinner /> {t('common.loading')}</> : <>{t('forms.company.submit')} <ArrowRight size={16} /></>}
        </motion.button>
      </motion.div>
    </motion.form>
  );
}

/* ─── Premium Role Card ──────────────────────────────────────── */
function RoleCard({ icon, title, description, features, badge, active, onClick, accentColor, accentRgb, accentLight }) {
  const { t } = useTranslation();
  return (
    <motion.button
      onClick={onClick}
      className="text-left w-full relative overflow-hidden"
      style={{
        borderRadius: '24px', padding: '32px 28px',
        background: active ? `rgba(${accentRgb},0.06)` : 'var(--bg-card)',
        border: `2px solid ${active ? `rgba(${accentRgb},0.5)` : 'var(--border-default)'}`,
        cursor: 'pointer',
        backdropFilter: active ? 'blur(12px)' : 'none',
        boxShadow: active
          ? `0 0 0 1px rgba(${accentRgb},0.12),0 24px 64px rgba(${accentRgb},0.16),inset 0 1px 0 rgba(255,255,255,0.04)`
          : '0 2px 12px rgba(0,0,0,0.05)',
        transition: 'border-color 0.2s,background 0.2s,box-shadow 0.2s',
      }}
      whileHover={{
        y: -8,
        boxShadow: `0 0 0 2px rgba(${accentRgb},0.4),0 28px 64px rgba(${accentRgb},0.18)`,
        transition: { type: 'spring', stiffness: 340, damping: 20 },
      }}
      whileTap={{ scale: 0.985 }}
      animate={{ y: active ? -6 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <AnimatePresence>
        {active && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 20% 30%,rgba(${accentRgb},0.13) 0%,transparent 60%)` }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          />
        )}
      </AnimatePresence>

      {badge && (
        <div style={{
          position: 'absolute', top: '16px',
          insetInlineEnd: '16px',
          padding: '4px 10px', borderRadius: '20px',
          fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.04em',
          background: `rgba(${accentRgb},0.1)`,
          color: accentColor,
          border: `1px solid rgba(${accentRgb},0.22)`,
        }}>
          {badge}
        </div>
      )}

      <div className="relative z-10">
        <motion.div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 relative"
          style={{ background: accentLight }}
          whileHover={{ rotate: [-2, 4, -2, 0], transition: { duration: 0.45 } }}
        >
          {active && (
            <div className="absolute inset-0 rounded-2xl"
              style={{ boxShadow: `0 0 24px rgba(${accentRgb},0.4)` }} />
          )}
          <div style={{ color: accentColor }}>{icon}</div>
        </motion.div>

        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-muted)', lineHeight: '1.65' }}>{description}</p>

        <ul className="space-y-2.5 mb-7">
          {features.map((f, i) => (
            <motion.li
              key={f}
              className="flex items-center gap-3 text-sm"
              style={{ color: 'var(--text-secondary)' }}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 + 0.1 }}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: accentLight }}>
                <CheckCircle size={12} style={{ color: accentColor }} />
              </div>
              {f}
            </motion.li>
          ))}
        </ul>

        <motion.div
          className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl w-fit"
          style={{ background: accentLight, color: accentColor }}
          whileHover={{ x: 5, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
        >
          {t('landing.getStartedCta')} <ArrowRight size={14} />
        </motion.div>
      </div>
    </motion.button>
  );
}

/* ─── Scroll-reveal wrapper ──────────────────────────────────── */
function RevealSection({ children, delay = 0, className, style }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Hero image panel (desktop only) ───────────────────────── */
function HeroImagePanel() {
  const { t } = useTranslation();
  return (
    <div className="relative hidden lg:flex items-center justify-end">
      <motion.div
        style={{
          position: 'relative', borderRadius: '28px', overflow: 'hidden',
          width: '100%', maxWidth: '540px', aspectRatio: '4/3',
          boxShadow: '0 40px 100px rgba(0,0,0,0.55),0 0 0 1px rgba(52,211,153,0.12)',
        }}
        initial={{ opacity: 0, x: 40, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <img
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80"
          alt="Professional team collaborating"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(5,97,27,0.42) 0%,rgba(16,185,129,0.1) 55%,transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '42%', background: 'linear-gradient(to top,rgba(1,11,5,0.72) 0%,transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '28px', border: '1px solid rgba(52,211,153,0.18)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '22px', left: '24px', right: '24px' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', marginBottom: '4px' }}>{t('landing.hiringStat')}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{t('landing.heroImageCaption')}</div>
        </div>
      </motion.div>

      {/* Floating: Active Jobs */}
      <motion.div
        style={{
          position: 'absolute', top: '8%', right: '-2%',
          background: 'rgba(12,22,12,0.8)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(52,211,153,0.22)',
          borderRadius: '18px', padding: '14px 18px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
        initial={{ opacity: 0, x: 24, y: -12 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 38, height: 38, borderRadius: '12px', background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={18} style={{ color: '#34d399' }} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1 }}>1,247</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem', marginTop: '3px' }}>{t('landing.jobsAvailableNow')}</div>
          </div>
        </div>
        <motion.div
          style={{ position: 'absolute', top: 9, right: 11, width: 7, height: 7, borderRadius: '50%', background: '#34d399' }}
          animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      </motion.div>

      {/* Floating: Hired this week */}
      <motion.div
        style={{
          position: 'absolute', bottom: '11%', left: '-4%',
          background: 'rgba(12,22,12,0.8)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(52,211,153,0.18)',
          borderRadius: '18px', padding: '12px 16px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
        initial={{ opacity: 0, x: -24, y: 12 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex' }}>
            {['JD', 'AM', 'SR'].map((initials, i) => (
              <div key={initials} style={{
                width: 30, height: 30, borderRadius: '50%',
                border: '2px solid rgba(1,11,5,0.85)',
                marginLeft: i > 0 ? '-8px' : 0, zIndex: 3 - i,
                background: ['linear-gradient(135deg,#10b981,#059669)','linear-gradient(135deg,#34d399,#10b981)','linear-gradient(135deg,#6ee7b7,#34d399)'][i],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.58rem', color: '#fff', fontWeight: 800, position: 'relative',
              }}>
                {initials}
              </div>
            ))}
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', lineHeight: 1 }}>+89 {t('landing.hiredThisWeek')}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', marginTop: '2px' }}>{t('landing.hiredThisWeekLabel')}</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Feature row ────────────────────────────────────────────── */
function FeatureRow({ imageUrl, imageAlt, tag, tagColor, tagBg, headline, body, points, cta, ctaClick, ctaBg, badgeLabel, badgeIcon, reverse = false }) {
  const { t } = useTranslation();
  return (
    <div className="grid lg:grid-cols-2 gap-16 items-center">
      {/* Image */}
      <RevealSection className={`relative ${reverse ? 'lg:order-2' : 'lg:order-1'}`}>
        <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', aspectRatio: '5/4', boxShadow: '0 20px 60px rgba(0,0,0,0.11)' }}>
          <img src={imageUrl} alt={imageAlt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(5,97,27,0.07) 0%,transparent 60%)' }} />
        </div>
        <motion.div
          style={{
            position: 'absolute',
            ...(reverse ? { bottom: '-16px', left: '-16px' } : { bottom: '-16px', right: '-16px' }),
            background: 'var(--bg-card)', border: '1px solid var(--border-default)',
            borderRadius: '16px', padding: '14px 18px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.09)',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}
          whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300, damping: 15 } }}
        >
          <div style={{ width: 38, height: 38, borderRadius: '11px', background: tagBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tagColor }}>
            {badgeIcon}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{badgeLabel}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('landing.verifiedMetric')}</div>
          </div>
        </motion.div>
      </RevealSection>

      {/* Text */}
      <RevealSection delay={0.15} className={reverse ? 'lg:order-1' : 'lg:order-2'}>
        <div>
          <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '20px', background: tagBg, color: tagColor, fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '18px' }}>
            {tag}
          </span>
          <h2 style={{ fontSize: 'clamp(1.7rem,3.2vw,2.5rem)', fontWeight: 800, lineHeight: 1.15, color: 'var(--text-primary)', marginBottom: '14px' }}>
            {headline}
          </h2>
          <p style={{ fontSize: '0.975rem', lineHeight: 1.7, color: 'var(--text-muted)', marginBottom: '28px' }}>{body}</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {points.map(({ icon, text }) => (
              <li key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '10px', background: tagBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tagColor, flexShrink: 0 }}>
                  {icon}
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{text}</span>
              </li>
            ))}
          </ul>
          <motion.button
            onClick={ctaClick}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              padding: '13px 26px', borderRadius: '14px', fontWeight: '700',
              fontSize: '0.9rem', cursor: 'pointer', background: ctaBg,
              color: '#fff', border: 'none', boxShadow: '0 4px 18px rgba(16,185,129,0.3)',
            }}
            whileHover={{ scale: 1.04, y: -2, boxShadow: '0 8px 28px rgba(16,185,129,0.4)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 20 }}
          >
            {cta} <ArrowRight size={15} />
          </motion.button>
        </div>
      </RevealSection>
    </div>
  );
}

/* ─── Testimonial card ───────────────────────────────────────── */
function TestimonialCard({ quote, name, role, company, avatar, delay }) {
  return (
    <RevealSection delay={delay}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-default)',
        borderRadius: '20px', padding: '28px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        height: '100%', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#10b981" style={{ color: '#10b981' }} />)}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, flex: 1, marginBottom: '22px', fontStyle: 'italic' }}>
          "{quote}"
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={avatar} alt={name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-light)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{role} · {company}</div>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* ─── Main Landing Page ─────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════ */
export function LandingPage() {
  const navigate    = useNavigate();
  const scrolled    = useScrolled();
  const { t, i18n: i18nObj } = useTranslation();
  const lang = i18nObj.language;
  const toggleLang = () => i18nObj.changeLanguage(lang === 'en' ? 'ar' : 'en');
  const [theme, toggleTheme]   = useTheme();
  const [role, setRole]        = useState(null);
  const formRef = useRef(null);
  const { setAuth } = useAuthStore();

  const handleJobSeekerSuccess = (result) => {
    const payload = result?.data ?? result;
    if (payload?.token && payload?.user) {
      setAuth(payload.token, payload.user);
    }
    navigate('/job-seeker/welcome');
  };

  const selectRole = (r) => {
    setRole(r);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  };
  const clearRole = () => setRole(null);

  return (
    <motion.div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-page)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}
    >

      {/* ══════════════════════════════════════════════════════ */}
      {/* FIXED NAVBAR                                          */}
      {/* ══════════════════════════════════════════════════════ */}
      <Navbar
        scrolled={scrolled}
        lang={lang}
        onToggleLang={toggleLang}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSelectRole={selectRole}
        onLogin={() => navigate('/login')}
      />

      {/* ══════════════════════════════════════════════════════ */}
      {/* HERO                                                  */}
      {/* ══════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}
      >
        {/* Layer 1: Background photo */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1920&q=80"
            alt=""
            aria-hidden="true"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }}
          />
        </div>

        {/* Layer 2: Dark green cinematic overlay */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(110deg,rgba(1,10,6,0.92) 0%,rgba(2,18,10,0.82) 45%,rgba(3,22,13,0.78) 100%)',
        }} />

        {/* Layer 3: Green radial accent */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 70% 60% at 15% 50%,rgba(16,185,129,0.1) 0%,transparent 70%)',
        }} />

        {/* Layer 4: Glow orbs */}
        <GlowOrb duration={9}  delay={0}   style={{ top: '-80px',   right: '-60px',  width: '600px', height: '600px', background: 'radial-gradient(circle,rgba(16,185,129,0.16) 0%,transparent 65%)' }} />
        <GlowOrb duration={11} delay={2.5} style={{ bottom: '-80px', left: '-80px',   width: '440px', height: '440px', background: 'radial-gradient(circle,rgba(20,184,166,0.1) 0%,transparent 65%)' }} />
        <GlowOrb duration={14} delay={1}   style={{ top: '30%',     left: '4%',      width: '260px', height: '260px', background: 'radial-gradient(circle,rgba(132,204,22,0.07) 0%,transparent 65%)' }} />

        {/* Layer 5: Dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px,transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 80% 75% at 50% 50%,black 30%,transparent 100%)',
        }} />

        {/* Layer 6: Bottom fade into page bg */}
        <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom,transparent,var(--bg-page))' }} />

        {/* Content */}
        <div
          className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-10"
          style={{ paddingTop: '8rem', paddingBottom: '6rem' }}
        >
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 xl:gap-20 items-center">

            {/* LEFT: Text content */}
            <motion.div
              variants={heroContainer}
              initial="hidden"
              animate="visible"
              className="text-center lg:text-left"
            >
              {/* Live badge */}
              <motion.div variants={heroItem} className="mb-8 flex justify-center lg:justify-start">
                <div
                  className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold"
                  style={{
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.28)',
                    color: '#6ee7b7',
                    backdropFilter: 'blur(12px)',
                    letterSpacing: '0.02em',
                  }}
                >
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: '#34d399' }}
                    animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  <Sparkles size={12} style={{ opacity: 0.7 }} />
                  {t('landing.badge')}
                </div>
              </motion.div>

              {/* Headline */}
              <motion.div variants={heroItem} className="mb-7">
                <h1
                  className="font-extrabold leading-[1.06] tracking-tight"
                  style={{ fontSize: 'clamp(2.8rem,5.5vw,4.6rem)', color: '#f0fdf4', textShadow: '0 2px 40px rgba(0,0,0,0.5)' }}
                >
                  {t('landing.headline1')}
                  <br />
                  <span style={{
                    background: 'linear-gradient(130deg,#6ee7b7 0%,#34d399 35%,#a7f3d0 65%,#6ee7b7 100%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    display: 'inline-block',
                    animation: 'gradientSlide 4s linear infinite',
                  }}>
                    {t('landing.headline2')}
                  </span>
                  <br />
                  {t('landing.headline3')}&nbsp;
                  <span style={{ color: 'rgba(240,253,244,0.5)' }}>{t('landing.headline4')}</span>
                </h1>
              </motion.div>

              {/* Sub */}
              <motion.p
                variants={heroItem}
                className="text-base sm:text-lg mb-10 leading-relaxed mx-auto lg:mx-0"
                style={{ color: 'rgba(240,253,244,0.62)', fontWeight: 400, maxWidth: '500px' }}
              >
                {t('landing.sub')}
              </motion.p>

              {/* CTAs */}
              <motion.div
                variants={heroItem}
                className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-12"
              >
                <ShimmerButton onClick={() => selectRole('seeker')} variant="primary">
                  <User size={16} />
                  {t('landing.cta1')}
                </ShimmerButton>
                <ShimmerButton onClick={() => selectRole('company')} variant="secondary">
                  <Building2 size={16} />
                  {t('landing.cta2')}
                </ShimmerButton>
              </motion.div>

              {/* Stats bar */}
              <motion.div variants={heroItem}>
                <div
                  className="inline-flex flex-wrap justify-center lg:justify-start gap-0 rounded-2xl overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 0 60px rgba(16,185,129,0.05),inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                >
                  {[
                    { value: '10K+', label: t('landing.statsJobs') },
                    { value: '5K+',  label: t('landing.statsCompanies') },
                    { value: '50K+', label: t('landing.statsJobSeekers') },
                  ].map((s, i) => (
                    <motion.div
                      key={s.label}
                      className="px-7 py-4 text-center"
                      style={{ borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 + i * 0.1, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                      whileHover={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <p style={{ fontSize: '1.35rem', fontWeight: 800, background: 'linear-gradient(135deg,#ffffff,#a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        {s.value}
                      </p>
                      <p className="text-xs mt-0.5 font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* RIGHT: Image panel */}
            <HeroImagePanel />
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <motion.span
            className="text-xs font-medium"
            style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
          >
            {t('landing.scroll')}
          </motion.span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
            <ChevronDown size={16} />
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* FEATURE: For Job Seekers                             */}
      {/* ══════════════════════════════════════════════════════ */}
      <section style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <FeatureRow
            imageUrl="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=700&q=80"
            imageAlt="Professional job seeker"
            tag={t('landing.forJobSeekers')}
            tagColor="var(--primary)"
            tagBg="var(--primary-light)"
            headline={t('landing.forJobSeekersHeadline')}
            body={t('landing.forJobSeekersSub')}
            points={[
              { icon: <Search size={17} />, text: t('landing.forJobSeekersPt1') },
              { icon: <Shield size={17} />, text: t('landing.forJobSeekersPt2') },
              { icon: <Globe size={17} />, text: t('landing.forJobSeekersPt3') },
            ]}
            cta={t('landing.forJobSeekersCta')}
            ctaClick={() => selectRole('seeker')}
            ctaBg="linear-gradient(135deg,#059669 0%,#10b981 100%)"
            badgeLabel={t('landing.forJobSeekersBadge')}
            badgeIcon={<Zap size={19} />}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* FEATURE: For Companies                               */}
      {/* ══════════════════════════════════════════════════════ */}
      <section style={{ padding: '96px 24px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <FeatureRow
            reverse
            imageUrl="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=700&q=80"
            imageAlt="Modern company office"
            tag={t('landing.forCompanies')}
            tagColor="var(--clr-info-a10)"
            tagBg="rgba(64,119,209,0.09)"
            headline={t('landing.forCompaniesHeadline')}
            body={t('landing.forCompaniesSub')}
            points={[
              { icon: <Users size={17} />, text: t('landing.forCompaniesPt1') },
              { icon: <Award size={17} />, text: t('landing.forCompaniesPt2') },
              { icon: <Zap size={17} />, text: t('landing.forCompaniesPt3') },
            ]}
            cta={t('landing.forCompaniesCta')}
            ctaClick={() => selectRole('company')}
            ctaBg="linear-gradient(135deg,#2563eb 0%,#4077d1 100%)"
            badgeLabel={t('landing.forCompaniesBadge')}
            badgeIcon={<Building2 size={19} style={{ color: 'var(--clr-info-a10)' }} />}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ROLE SELECTION CARDS                                 */}
      {/* ══════════════════════════════════════════════════════ */}
      <section style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <RevealSection className="text-center" style={{ marginBottom: '56px' }}>
            <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '20px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
              {t('landing.getStartedBadge')}
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
              {t('landing.choosePath')}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
              {t('landing.choosePathSub')}
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <RevealSection delay={0.05}>
              <RoleCard
                icon={<User size={28} />}
                title={t('landing.roleJobSeeker')}
                description={t('landing.roleJobSeekerDesc')}
                features={[t('landing.roleJobSeekerF1'), t('landing.roleJobSeekerF2'), t('landing.roleJobSeekerF3')]}
                badge={t('landing.roleJobSeekerBadge')}
                active={role === 'seeker'}
                onClick={() => selectRole('seeker')}
                accentColor="var(--primary)"
                accentRgb="5,97,27"
                accentLight="var(--primary-light)"
              />
            </RevealSection>
            <RevealSection delay={0.12}>
              <RoleCard
                icon={<Building2 size={28} />}
                title={t('landing.roleCompany')}
                description={t('landing.roleCompanyDesc')}
                features={[t('landing.roleCompanyF1'), t('landing.roleCompanyF2'), t('landing.roleCompanyF3')]}
                badge={t('landing.roleCompanyBadge')}
                active={role === 'company'}
                onClick={() => selectRole('company')}
                accentColor="var(--clr-info-a10)"
                accentRgb="64,119,209"
                accentLight="rgba(64,119,209,0.08)"
              />
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* REGISTRATION FORM                                    */}
      {/* ══════════════════════════════════════════════════════ */}
      <div ref={formRef}>
        <AnimatePresence mode="wait">
          {role && (
            <motion.section
              key={role}
              className="px-6 pb-24"
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <motion.div
                className="max-w-2xl mx-auto rounded-3xl"
                style={{ padding: '36px 40px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: '0 20px 70px rgba(0,0,0,0.08),0 4px 20px rgba(0,0,0,0.04)' }}
                layout
              >
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <motion.div
                        style={{ width: 46, height: 46, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: role === 'seeker' ? 'var(--primary-light)' : 'rgba(64,119,209,0.1)' }}
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.1, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                      >
                        {role === 'seeker'
                          ? <User size={21} style={{ color: 'var(--primary)' }} />
                          : <Building2 size={21} style={{ color: 'var(--clr-info-a10)' }} />}
                      </motion.div>
                      <div>
                        <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
                          {role === 'seeker' ? t('landing.formCreateSeeker') : t('landing.formRegisterCompany')}
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {role === 'seeker' ? t('landing.formSubtitleSeeker') : t('landing.formSubtitleCompany')}
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={clearRole}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', color: 'var(--text-muted)', border: '1px solid var(--border-default)', background: 'transparent' }}
                      whileHover={{ background: 'var(--bg-hover)', scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      ← {t('landing.formBack')}
                    </motion.button>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border-default)', marginTop: '20px' }} />
                </div>

                {role === 'seeker'
                  ? <JobSeekerForm onBack={clearRole} onSuccess={handleJobSeekerSuccess} />
                  : <CompanyForm onBack={clearRole} />
                }

                <p style={{ textAlign: 'center', fontSize: '0.8rem', marginTop: '20px', color: 'var(--text-muted)' }}>
                  {t('landing.alreadyHaveAccount')}{' '}
                  <motion.button
                    onClick={() => navigate('/login')}
                    style={{ fontWeight: '700', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                  >
                    {t('nav.signIn')}
                  </motion.button>
                </p>
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* HOW IT WORKS                                         */}
      {/* ══════════════════════════════════════════════════════ */}
      <section style={{ padding: '96px 24px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-default)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <RevealSection className="text-center" style={{ marginBottom: '64px' }}>
            <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '20px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
              {t('landing.howItWorksBadge')}
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>{t('landing.howItWorks')}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '420px', margin: '0 auto' }}>{t('landing.howItWorksSub')}</p>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            <div className="hidden sm:block absolute" style={{ top: '35px', left: 'calc(16.66% + 1.75rem)', right: 'calc(16.66% + 1.75rem)', height: '1px', background: 'linear-gradient(90deg,transparent 0%,var(--border-strong) 20%,var(--border-strong) 80%,transparent 100%)' }} />
            {[
              { step: '01', icon: <User size={24} />,   titleKey: 'step1Title', descKey: 'step1Desc' },
              { step: '02', icon: <Search size={24} />, titleKey: 'step2Title', descKey: 'step2Desc' },
              { step: '03', icon: <Users size={24} />,  titleKey: 'step3Title', descKey: 'step3Desc' },
            ].map((item, i) => (
              <RevealSection key={item.step} delay={i * 0.12}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <motion.div
                    style={{ width: 70, height: 70, borderRadius: '22px', background: 'linear-gradient(135deg,var(--primary-light) 0%,rgba(16,185,129,0.05) 100%)', border: '2px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', position: 'relative', zIndex: 10, color: 'var(--primary)' }}
                    whileHover={{ scale: 1.12, rotate: 5, transition: { type: 'spring', stiffness: 300, damping: 12 } }}
                  >
                    {item.icon}
                  </motion.div>
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase' }}>{t('landing.step')} {item.step}</span>
                  <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>{t(`landing.${item.titleKey}`)}</h3>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--text-muted)' }}>{t(`landing.${item.descKey}`)}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* TESTIMONIALS                                         */}
      {/* ══════════════════════════════════════════════════════ */}
      <section style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <RevealSection className="text-center" style={{ marginBottom: '56px' }}>
            <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '20px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
              {t('landing.successStoriesBadge')}
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)', fontWeight: 800, color: 'var(--text-primary)' }}>
              {t('landing.testimonialsTitle')}
            </h2>
          </RevealSection>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <TestimonialCard quote="Found my dream role in tech within 3 weeks. The matching algorithm is incredibly accurate — I only applied to jobs that fit perfectly." name="Sarah Chen" role="Software Engineer" company="TechNova" avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80" delay={0} />
            <TestimonialCard quote="We hired 12 engineers this quarter using Talento. The quality of candidates is exceptional and the process is seamless end-to-end." name="Marcus Rodriguez" role="Head of Engineering" company="BuildIt Inc" avatar="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=80&h=80&q=80" delay={0.1} />
            <TestimonialCard quote="Switched careers from finance to UX design. Talento's diverse listings and career resources made the whole transition possible." name="Amara Osei" role="UX Designer" company="DataFlow" avatar="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=80&h=80&q=80" delay={0.2} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* TRUST SECTION                                        */}
      {/* ══════════════════════════════════════════════════════ */}
      <section style={{ padding: '60px 24px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-default)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
          <RevealSection>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '28px' }}>
              {t('landing.trustedBadge')}
            </p>
          </RevealSection>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            {['Acme Corp', 'TechNova', 'BuildIt', 'DataFlow', 'NexGen', 'Cloudex'].map((name, i) => (
              <RevealSection key={name} delay={i * 0.06}>
                <motion.div
                  style={{ padding: '10px 22px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700', background: 'var(--bg-page)', border: '1px solid var(--border-default)', color: 'var(--text-muted)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                  whileHover={{ y: -4, color: 'var(--primary)', borderColor: 'var(--primary)', boxShadow: '0 8px 24px rgba(5,97,27,0.12)', transition: { type: 'spring', stiffness: 350, damping: 18 } }}
                >
                  {name}
                </motion.div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* CTA BANNER                                           */}
      {/* ══════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px' }}>
        <RevealSection>
          <div style={{
            maxWidth: '880px', margin: '0 auto', textAlign: 'center',
            padding: '64px 40px', borderRadius: '32px',
            background: 'linear-gradient(135deg,#010b05 0%,#051a0d 50%,#041714 100%)',
            border: '1px solid rgba(52,211,153,0.14)',
            boxShadow: '0 20px 80px rgba(0,0,0,0.14)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,0.22) 0%,transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(52,211,153,0.16) 0%,transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: '6px 16px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)' }}>
                <Sparkles size={13} style={{ color: '#34d399' }} />
                <span style={{ color: '#6ee7b7', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.03em' }}>{t('landing.ctaBannerBadge')}</span>
              </div>
              <h2 style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 800, color: '#f0fdf4', marginBottom: '16px', lineHeight: 1.15 }}>
                {t('landing.ctaBannerTitle')}
              </h2>
              <p style={{ color: 'rgba(240,253,244,0.58)', fontSize: '1rem', maxWidth: '460px', margin: '0 auto 36px' }}>
                {t('landing.ctaBannerSub')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
                <ShimmerButton onClick={() => selectRole('seeker')} variant="primary">
                  <User size={16} />{t('landing.cta1')}
                </ShimmerButton>
                <ShimmerButton onClick={() => selectRole('company')} variant="secondary">
                  <Building2 size={16} />{t('landing.cta2')}
                </ShimmerButton>
              </div>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* FOOTER                                               */}
      {/* ══════════════════════════════════════════════════════ */}
      <footer style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-card)', padding: '36px 24px 28px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '10px', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3.5 5.5h13M10 5.5v9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Talento</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            © {new Date().getFullYear()} Talento. {t('landing.footerRights')}
          </p>
          <motion.button
            onClick={() => navigate('/login')}
            style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
            whileHover={{ scale: 1.04, x: 3 }} whileTap={{ scale: 0.96 }}
          >
            {t('landing.footerLogin')} →
          </motion.button>
        </div>
      </footer>

      {/* Global keyframes + RTL arrow flip */}
      <style>{`
        @keyframes gradientSlide {
          0%   { background-position: 0%   center; }
          100% { background-position: 200% center; }
        }
        [dir="rtl"] .arrow-flip { transform: scaleX(-1); }
      `}</style>
    </motion.div>
  );
}
