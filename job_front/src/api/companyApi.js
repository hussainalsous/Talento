import axiosClient from './axiosClient';

/**
 * Company API — all routes under /company (role: company_owner | company_member)
 *
 * Confirmed backend routes:
 *   GET    /company/profile
 *   PATCH  /company/profile
 *   POST   /company/logo
 *   GET    /company/members
 *   POST   /company/members              body: { first_name, last_name, email, phone, password, role_in_company }
 *   PATCH  /company/members/{id}         body: { first_name, last_name, role_in_company }
 *   DELETE /company/members/{id}
 *   GET    /company/job-posts            params: status, per_page
 *   POST   /company/job-posts            body: { title, description, employment_type, location, ... }
 *   PATCH  /company/job-posts/{id}
 *   DELETE /company/job-posts/{id}
 *   GET    /company/job-posts/{id}/applicants   params: status, sort, dir, per_page
 *   PATCH  /company/applications/{id}/status    body: { status, score? }
 *   GET    /company/candidates           params: search, location, preferred_job_type, skill_ids, salary_max
 *   GET    /company/candidates/{id}
 *   POST   /company/candidates/{id}/request-cv-access
 *   GET    /company/invitations          params: status, per_page
 *   POST   /company/invitations          body: { job_seeker_id, job_post_id?, message? }
 *
 * Public:
 *   GET    /courses                      params: search, per_page
 *
 * MISSING (no backend endpoint):
 *   - /company/dashboard   → use /company/profile + /company/job-posts
 *   - GET /company/applications list  → only per-job: /company/job-posts/{id}/applicants
 *   - GET /company/job-posts/{id}     → no show endpoint, use list with filter
 */
export const companyApi = {
  /* ── Profile ───────────────────────────────────────────── */
  /** GET /company/profile */
  getProfile: () =>
    axiosClient.get('/company/profile'),

  /** PATCH /company/profile */
  updateProfile: (data) =>
    axiosClient.patch('/company/profile', data),

  /** POST /company/logo — multipart/form-data with 'logo' file */
  uploadLogo: (formData) =>
    axiosClient.post('/company/logo', formData, { headers: { 'Content-Type': null } }),

  /* ── Members ───────────────────────────────────────────── */
  /** GET /company/members */
  getMembers: (params) =>
    axiosClient.get('/company/members', { params }),

  /**
   * POST /company/members
   * Body: { first_name, last_name, email, phone?, password, role_in_company? }
   */
  addMember: (data) =>
    axiosClient.post('/company/members', data),

  /**
   * PATCH /company/members/{id}
   * Body: { first_name?, last_name?, role_in_company? }
   */
  updateMember: (id, data) =>
    axiosClient.patch(`/company/members/${id}`, data),

  /** DELETE /company/members/{id} */
  removeMember: (id) =>
    axiosClient.delete(`/company/members/${id}`),

  /* ── Job Posts ─────────────────────────────────────────── */
  /**
   * GET /company/job-posts
   * Params: status, per_page
   */
  getJobPosts: (params) =>
    axiosClient.get('/company/job-posts', { params }),

  /**
   * No GET /company/job-posts/{id} show endpoint exists.
   * Fetch the list and find by ID as a workaround.
   */
  getJobPost: async (id) => {
    const res = await axiosClient.get('/company/job-posts', { params: { per_page: 100 } });
    // res is the normalized response body: { data: [...], meta: {...} }
    const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    const found = list.find((p) => String(p.id) === String(id));
    if (!found) throw { status: 404, message: 'Job post not found.' };
    return { data: found };
  },

  /**
   * POST /company/job-posts
   * Body: { title, description, employment_type (required), location?, salary_min?,
   *         salary_max?, responsibilities?, requirements?, status? (draft|published),
   *         expires_at?, skill_ids? }
   */
  createJobPost: (data) =>
    axiosClient.post('/company/job-posts', data),

  /** PATCH /company/job-posts/{id} */
  updateJobPost: (id, data) =>
    axiosClient.patch(`/company/job-posts/${id}`, data),

  /** DELETE /company/job-posts/{id} */
  deleteJobPost: (id) =>
    axiosClient.delete(`/company/job-posts/${id}`),

  /**
   * GET /company/job-posts/{id}/applicants
   * Params: status, sort, dir, per_page
   */
  getJobPostApplicants: (id, params) =>
    axiosClient.get(`/company/job-posts/${id}/applicants`, { params }),

  /* ── Application Status ────────────────────────────────── */
  /**
   * PATCH /company/applications/{id}/status
   * Body: { status: 'under_review'|'shortlisted'|'rejected'|'accepted', score? }
   */
  updateApplicationStatus: (id, data) =>
    axiosClient.patch(`/company/applications/${id}/status`, data),

  /* ── Candidates ────────────────────────────────────────── */
  /**
   * GET /company/candidates
   * Params: search, location, preferred_job_type, skill_ids, salary_max, per_page
   */
  getCandidates: (params) =>
    axiosClient.get('/company/candidates', { params }),

  /** GET /company/candidates/{jobSeeker} */
  getCandidate: (id) =>
    axiosClient.get(`/company/candidates/${id}`),

  /**
   * POST /company/candidates/{jobSeeker}/request-cv-access
   * Body: { message? }
   */
  requestCvAccess: (id, message) =>
    axiosClient.post(`/company/candidates/${id}/request-cv-access`, { message }),

  /* ── Invitations ───────────────────────────────────────── */
  /**
   * GET /company/invitations
   * Params: status, per_page
   */
  getInvitations: (params) =>
    axiosClient.get('/company/invitations', { params }),

  /**
   * POST /company/invitations
   * Body: { job_seeker_id (required), job_post_id?, message? }
   */
  createInvitation: (data) =>
    axiosClient.post('/company/invitations', data),

  /* ── Courses (public) ──────────────────────────────────── */
  /** GET /courses */
  getCourses: (params) =>
    axiosClient.get('/courses', { params }),
};
