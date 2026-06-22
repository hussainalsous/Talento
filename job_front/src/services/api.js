import axios from 'axios';

/**
 * Public-facing axios instance for the landing page.
 * Supports Bearer token injection for future protected routes.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000,
});

/* Inject token if present */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* Normalize error responses */
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const data = error.response?.data;
    return Promise.reject({
      status:  error.response?.status,
      message: data?.message || 'An unexpected error occurred.',
      errors:  data?.errors  || null,
    });
  },
);

export default api;
