/**
 * Returns the React Router path to navigate to when a notification is clicked,
 * or null if there is no relevant deep-link for this type.
 *
 * The notification `data` JSONB field contains the `type` key plus contextual
 * IDs (application_id, request_id, job_post_id, etc.) stored by the backend.
 */
export function getNotificationPath(notification) {
  const type = notification.data?.type;
  const data = notification.data ?? {};

  switch (type) {
    // ── Admin ──────────────────────────────────────────────────────────────
    case 'company_registration_request':
      return data.request_id
        ? `/admin/company-requests/${data.request_id}`
        : '/admin/company-requests';

    // ── Company — applicants ───────────────────────────────────────────────
    case 'new_application':
    case 'application_withdrawn_company':
      return data.application_id
        ? `/company/applicants/${data.application_id}`
        : '/company/applicants';

    // ── Company — job posts ────────────────────────────────────────────────
    case 'job_post_created':
    case 'job_post_updated':
    case 'job_post_deleted':
      return data.job_post_id
        ? `/company/job-posts/${data.job_post_id}`
        : '/company/job-posts';

    // ── Company — members ──────────────────────────────────────────────────
    case 'member_added':
    case 'member_updated':
    case 'member_removed':
      return '/company/members';

    // ── Company — profile ──────────────────────────────────────────────────
    case 'company_profile_updated':
    case 'company_logo_updated':
      return '/company/profile';

    // ── Company — invitations (inviter is notified of the response) ────────
    case 'invitation_responded':
      return '/company/invitations';

    // ── No deep-link (job seeker section routes not fully implemented yet,
    //    or notification is purely informational) ───────────────────────────
    default:
      return null;
  }
}
