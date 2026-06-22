import rootClient from './rootClient';

/**
 * AI Match API — endpoints live at the API ROOT (/api), not /api/v1.
 * These are served by the async n8n + Qdrant matching pipeline.
 *
 * Backend routes:
 *   GET  /api/jobs/{jobPostId}/matches            params: min_score, status, per_page
 *   PUT  /api/jobs/{jobPostId}/matches/{matchId}  body: { status }
 *   GET  /api/candidate/matches                   params: per_page
 */
export const matchApi = {
  /* ── Company ───────────────────────────────────────────── */
  /**
   * GET /jobs/{jobPostId}/matches
   * Params: min_score (0..1), status, per_page
   * Side effect: returned "new" matches are flipped to "viewed".
   */
  getJobMatches: (jobPostId, params) =>
    rootClient.get(`/jobs/${jobPostId}/matches`, { params }),

  /**
   * PUT /jobs/{jobPostId}/matches/{matchId}
   * Body: { status: 'shortlisted' | 'rejected' | 'new' }
   */
  updateMatchStatus: (jobPostId, matchId, status) =>
    rootClient.put(`/jobs/${jobPostId}/matches/${matchId}`, { status }),

  /* ── Candidate ─────────────────────────────────────────── */
  /**
   * GET /candidate/matches
   * Params: per_page. Returns matches with score >= 0.60, score desc.
   */
  getMyMatches: (params) =>
    rootClient.get('/candidate/matches', { params }),
};
