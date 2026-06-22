import axiosClient from './axiosClient';

/**
 * Auth API — routes under /auth
 *
 * Existing backend routes:
 *   POST  /auth/login
 *   POST  /auth/logout           (sanctum)
 *   GET   /auth/me               (sanctum)
 *   PATCH /auth/password         (sanctum)
 *
 */
export const authApi = {
  /** POST /auth/login */
  login: (credentials) =>
    axiosClient.post('/auth/login', credentials),

  /** POST /auth/logout */
  logout: () =>
    axiosClient.post('/auth/logout'),

  /** GET /auth/me */
  me: () =>
    axiosClient.get('/auth/me'),

  /**
   * PATCH /auth/password
   * Body: { current_password, password, password_confirmation }
   */
  changePassword: (data) =>
    axiosClient.patch('/auth/password', data),

  /** POST /email/verification-notification */
  resendVerification: () =>
    axiosClient.post('/email/verification-notification'),

  /** POST /auth/forgot-password */
  forgotPassword: (data) =>
    axiosClient.post('/auth/forgot-password', data),

  /** POST /auth/reset-password */
  resetPassword: (data) =>
    axiosClient.post('/auth/reset-password', data),
};
