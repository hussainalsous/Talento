/**
 * Format a date string to a human-readable format.
 */
export function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    ...opts,
  });
}

/**
 * Format a datetime string.
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Humanize a role slug.
 */
export function humanizeRole(role) {
  if (!role) return '—';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Truncate a string.
 */
export function truncate(str, max = 60) {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

/**
 * Extract data and pagination from a Laravel API response.
 *
 * useFetch returns payload = res.data (Axios response body), which is:
 *   { success, data: [...items...], meta: { current_page, per_page, total, last_page } }
 *
 * `meta` is a SIBLING of `data` at the top level of the response body —
 * it is NOT nested inside `data`. So we must read `response.meta`, not `response.data.meta`.
 */
export function extractPagination(response) {
  if (!response) return { data: [], pagination: null };

  // Primary case: response IS the Laravel body { success, data: [...], meta: {...} }
  // useFetch already strips the Axios wrapper, so response = res.data.
  if (response?.meta && Array.isArray(response?.data)) {
    const m = response.meta;
    return {
      data:       response.data,
      pagination: {
        current_page: m.current_page,
        last_page:    m.last_page,
        total:        m.total,
        per_page:     m.per_page,
        from:         m.from ?? ((m.current_page - 1) * m.per_page) + 1,
        to:           m.to   ?? Math.min(m.current_page * m.per_page, m.total),
      },
    };
  }

  // Fallback: response may be { data: { data: [...], meta: {...} } } (double-wrapped)
  const body = response?.data ?? response;
  if (body?.meta && Array.isArray(body?.data)) {
    const m = body.meta;
    return {
      data:       body.data,
      pagination: {
        current_page: m.current_page,
        last_page:    m.last_page,
        total:        m.total,
        per_page:     m.per_page,
        from:         m.from ?? ((m.current_page - 1) * m.per_page) + 1,
        to:           m.to   ?? Math.min(m.current_page * m.per_page, m.total),
      },
    };
  }

  // Plain array responses
  if (Array.isArray(body?.data)) return { data: body.data, pagination: null };
  if (Array.isArray(body))       return { data: body,      pagination: null };

  return { data: [], pagination: null };
}
