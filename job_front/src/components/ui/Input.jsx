import { clsx } from 'clsx';
import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  { label, error, hint, className, required, leftElement, rightElement, ...props },
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
        {leftElement && <span className="input-addon input-addon-left">{leftElement}</span>}
        <input
          ref={ref}
          className={clsx('form-input', error && 'form-input-error', leftElement && 'pl-10', rightElement && 'pr-10', className)}
          {...props}
        />
        {rightElement && <span className="input-addon input-addon-right">{rightElement}</span>}
      </div>
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="form-hint">{hint}</p>}
    </div>
  );
});
