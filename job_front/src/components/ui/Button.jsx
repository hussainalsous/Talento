import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  danger:    'btn-danger',
  ghost:     'btn-ghost',
  outline:   'btn-outline',
};

const sizes = {
  sm:  'btn-sm',
  md:  'btn-md',
  lg:  'btn-lg',
  icon:'btn-icon',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  leftIcon,
  rightIcon,
  ...props
}) {
  return (
    <button
      className={clsx('btn', variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading
        ? <Loader2 size={16} className="animate-spin-slow" />
        : leftIcon}
      {children && <span>{children}</span>}
      {!loading && rightIcon}
    </button>
  );
}
