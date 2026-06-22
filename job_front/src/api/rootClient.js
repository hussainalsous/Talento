import axios from 'axios';

/**
 * Root API client — targets the API root (/api), NOT /api/v1.
 *
 * The AI match endpoints live at /api/jobs/... and /api/candidate/... — outside
 * the /v1 namespace that axiosClient uses. This instance mirrors axiosClient's
 * interceptor behavior (token inject, 401 → auth:logout, 403 → auth:forbidden,
 * normalized errors) but points at the bare /api root.
 */
const V1 = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const ROOT_URL = import.meta.env.VITE_API_ROOT_URL || V1.replace(/\/v1\/?$/, '');

const rootClient = axios.create({
  baseURL: ROOT_URL, // e.g. http://127.0.0.1:8000/api
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000,
});

/* ── Request interceptor: inject token + console log ────── */
rootClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      `%c[ROOT-API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      'color: #4a834b; font-weight: bold;',
      {
        params:  config.params || undefined,
        payload: config.data ? JSON.parse(typeof config.data === 'string' ? config.data : JSON.stringify(config.data)) : undefined,
        token:   token ? `${token.slice(0, 12)}…` : 'none',
      },
    );

    return config;
  },
  (error) => Promise.reject(error),
);

/* ── Response interceptor: console log + normalize errors ── */
rootClient.interceptors.response.use(
  (response) => {
    console.log(
      `%c[ROOT-API] ✓ ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
      'color: #22946e; font-weight: bold;',
      response.data,
    );
    return response;
  },
  (error) => {
    const { response } = error;

    if (!response) {
      console.error('[ROOT-API] ✕ Network error — no response received');
      return Promise.reject({ message: 'Network error. Please check your connection.', status: 0 });
    }

    const { status, data, config } = response;

    console.error(
      `%c[ROOT-API] ✕ ${status} ${config?.method?.toUpperCase()} ${config?.url}`,
      'color: #d94a4a; font-weight: bold;',
      data,
    );

    if (status === 401 && !config?.url?.includes('/auth/logout')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    if (status === 403 && data?.email_verified !== false) {
      window.dispatchEvent(new CustomEvent('auth:forbidden'));
    }

    return Promise.reject({
      status,
      message: data?.message || getDefaultMessage(status),
      errors:  data?.errors  || null,
      data:    data          || null,
    });
  },
);

function getDefaultMessage(status) {
  const map = {
    400: 'Bad request.',
    401: 'Session expired. Please log in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    422: 'Validation failed. Please check your input.',
    429: 'Too many requests. Please slow down.',
    500: 'Server error. Please try again later.',
  };
  return map[status] || 'An unexpected error occurred.';
}

export default rootClient;
