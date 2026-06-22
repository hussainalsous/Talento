import { clsx } from 'clsx';
import { forwardRef } from 'react';

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className, required, rows = 4, ...props },
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
      <textarea
        ref={ref}
        rows={rows}
        className={clsx('form-input', 'resize-y', error && 'form-input-error', className)}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="form-hint">{hint}</p>}
    </div>
  );
});
