import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic data-fetching hook.
 * @param {function} fetchFn — async function that returns the axios response
 * @param {object}   options — { immediate: bool, deps: array }
 */
export function useFetch(fetchFn, options = {}) {
  const { immediate = true, deps = [] } = options;
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error,   setError]   = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFn(...args);
      const payload = res?.data ?? res;
      if (mountedRef.current) setData(payload);
      return payload;
    } catch (err) {
      if (mountedRef.current) setError(err?.message || 'Failed to load data.');
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchFn]); // eslint-disable-line

  useEffect(() => {
    if (immediate) execute();
  }, deps); // eslint-disable-line

  return { data, loading, error, refetch: execute };
}
