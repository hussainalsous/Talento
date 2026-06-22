import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000,
});

/* ── Request interceptor: inject token + console log ────── */
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      `%c[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      'color: #4a834b; font-weight: bold;',
      {
        params:  config.params  || undefined,
        payload: config.data    ? JSON.parse(typeof config.data === 'string' ? config.data : JSON.stringify(config.data)) : undefined,
        token:   token ? `${token.slice(0, 12)}…` : 'none',
      },
    );

    return config;
  },
  (error) => Promise.reject(error),
);

/* ── Response interceptor: console log + normalize errors ── */
axiosClient.interceptors.response.use(
  (response) => {
    console.log(
      `%c[API] ✓ ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
      'color: #22946e; font-weight: bold;',
      response.data,
    );
    return response;
  },
  (error) => {
    const { response } = error;

    if (!response) {
      console.error('[API] ✕ Network error — no response received');
      return Promise.reject({ message: 'Network error. Please check your connection.', status: 0 });
    }

    const { status, data, config } = response;

    console.error(
      `%c[API] ✕ ${status} ${config?.method?.toUpperCase()} ${config?.url}`,
      'color: #d94a4a; font-weight: bold;',
      data,
    );

    // Don't dispatch auth:logout for the logout endpoint itself — doing so
    // creates an infinite loop: logout() → POST /auth/logout → 401 → auth:logout → repeat.
    if (status === 401 && !config?.url?.includes('/auth/logout')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    if (status === 403 && data?.email_verified !== false) {
      window.dispatchEvent(new CustomEvent('auth:forbidden'));
    }

    const normalizedError = {
      status,
      message: data?.message || getDefaultMessage(status),
      errors:  data?.errors  || null,
      data:    data          || null,
    };

    return Promise.reject(normalizedError);
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

export default axiosClient;
