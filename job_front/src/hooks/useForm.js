import { useState, useCallback } from 'react';

/**
 * Minimal form state hook.
 * @param {object} initialValues
 * @param {function} validate  — receives values, returns errors object
 */
export function useForm(initialValues, validate) {
  const [values,   setValues]   = useState(initialValues);
  const [errors,   setErrors]   = useState({});
  const [touched,  setTouched]  = useState({});

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    // clear error on change
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const setValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const isValid = useCallback(() => {
    if (!validate) return true;
    const errs = validate(values);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [validate, values]);

  const setServerErrors = useCallback((errs) => {
    if (!errs) return;
    // Laravel validation errors: { field: ['msg1'] }
    const mapped = Object.fromEntries(
      Object.entries(errs).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
    );
    setErrors((prev) => ({ ...prev, ...mapped }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setValue,
    setValues,
    isValid,
    setErrors,
    setServerErrors,
    reset,
  };
}
