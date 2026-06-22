import { clsx } from 'clsx';
import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(function Select(
  { label, error, hint, className, required, options = [], placeholder, ...props },
  ref,
) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span style={{ color: 'var(--clr-danger-a10)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <div className="input-wrapper">
        <select
          ref={ref}
          className={clsx('form-input', 'pr-10 appearance-none', error && 'form-input-error', className)}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="input-addon input-addon-right pointer-events-none">
          <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
        </span>
      </div>
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="form-hint">{hint}</p>}
    </div>
  );
});
