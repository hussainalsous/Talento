import axiosClient from './axiosClient';

/**
 * Admin API — all routes under /admin (role: admin)
 */
export const adminApi = {
  /* ── Users ─────────────────────────────────────────────── */
  /**
   * GET /admin/users
   * Params: role, search, is_active, per_page
   */
  getUsers: (params) =>
    axiosClient.get('/admin/users', { params }),

  /** GET /admin/users/{user} */
  getUser: (id) =>
    axiosClient.get(`/admin/users/${id}`),

  /** PATCH /admin/users/{user}/activate */
  activateUser: (id) =>
    axiosClient.patch(`/admin/users/${id}/activate`),

  /** PATCH /admin/users/{user}/deactivate */
  deactivateUser: (id) =>
    axiosClient.patch(`/admin/users/${id}/deactivate`),

  /* ── System Employees ───────────────────────────────────── */
  /**
   * POST /admin/system-employees
   * Body: { first_name, last_name, email, password }
   */
  createSystemEmployee: (data) =>
    axiosClient.post('/admin/system-employees', data),

  /**
   * PATCH /admin/system-employees/{admin}/permissions
   * Body: { permissions: string[] }
   */
  updateSystemEmployeePermissions: (id, permissions) =>
    axiosClient.patch(`/admin/system-employees/${id}/permissions`, { permissions }),

  /* ── Company Registration Requests ─────────────────────── */
  /**
   * GET /admin/company-registration-requests
   * Params: status, per_page
   */
  getCompanyRequests: (params) =>
    axiosClient.get('/admin/redis/company-registration-requests', { params }),

  /** GET /admin/company-registration-requests/{id} */
  getCompanyRequest: (id) =>
    axiosClient.get(`/admin/company-registration-requests/${id}`),

  /** PATCH /admin/company-registration-requests/{id}/approve */
  approveCompanyRequest: (id) =>
    axiosClient.patch(`/admin/company-registration-requests/${id}/approve`),

  /**
   * PATCH /admin/company-registration-requests/{id}/reject
   * Body: { action: 'reject', rejection_reason: string }
   */
  rejectCompanyRequest: (id, rejectionReason) =>
    axiosClient.patch(`/admin/company-registration-requests/${id}/reject`, {
      action: 'reject',
      rejection_reason: rejectionReason,
    }),

  /* ── CV Moderation ─────────────────────────────────────── */
  /**
   * GET /admin/cvs/{cv}
   * NOTE: There is NO list/index endpoint for CVs.
   * Use /admin/candidates to browse job seekers and their CVs.
   */
  getCV: (id) =>
    axiosClient.get(`/admin/cvs/${id}`),

  /** DELETE /admin/cvs/{cv} */
  deleteCV: (id) =>
    axiosClient.delete(`/admin/cvs/${id}`),

  /* ── Candidates (admin view — bypasses privacy filters) ─── */
  /**
   * GET /admin/candidates
   * Params: search, location, per_page
   */
  getCandidates: (params) =>
    axiosClient.get('/admin/candidates', { params }),

  /** GET /admin/candidates/{jobSeeker} */
  getCandidate: (id) =>
    axiosClient.get(`/admin/candidates/${id}`),

  /* ── Courses (admin CRUD) ───────────────────────────────── */
  getCourses: (params) =>
    axiosClient.get('/admin/courses', { params }),

  getCourse: (id) =>
    axiosClient.get(`/admin/courses/${id}`),

  createCourse: (data) =>
    axiosClient.post('/admin/courses', data),

  updateCourse: (id, data) =>
    axiosClient.patch(`/admin/courses/${id}`, data),

  deleteCourse: (id) =>
    axiosClient.delete(`/admin/courses/${id}`),
};
