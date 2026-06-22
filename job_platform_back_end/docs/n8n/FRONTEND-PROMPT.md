# Front-End Implementation Prompt — Job ↔ Candidate Matching UI (Talento)

> Paste this to your front-end coding agent. It works in the React app at
> `C:\TALENTO\job_front`. Follow the existing conventions exactly; do not
> introduce new libraries.

---

## 0. Context (what you're building)

Talento now has an AI matching engine. An external **n8n** pipeline + **Qdrant**
vector DB produce candidate↔job matches **asynchronously**:

- When a **company publishes a job** → the job is embedded and matched against all
  CVs → match rows are written.
- When a **candidate's CV is processed** → it is embedded and matched against all
  open jobs → match rows are written.

Your job is the **UI that displays and acts on those match rows**. You do **not**
call n8n or Qdrant — you only read/update matches through three Laravel endpoints.
Because matching is asynchronous, matches may appear a few seconds after a publish;
the UI must handle "no matches yet" gracefully and offer a manual refresh.

Two surfaces:
1. **Company** — per job post: ranked list of matched candidates, filter by score
   and status, and shortlist/reject each candidate.
2. **Candidate (job seeker)** — "My Matches": ranked list of jobs they matched,
   read-only.

---

## 1. CRITICAL: API base URL

`src/api/axiosClient.js` has `baseURL = …/api/v1`. **The match endpoints are NOT
under `/api/v1`** — they are at `/api/jobs/...` and `/api/candidate/...`.

Create a **second axios instance** that targets the API root (`/api`, no `/v1`),
reusing the same token + error handling. Add `src/api/rootClient.js`:

```js
import axios from 'axios';

// Derive the root (/api) from the configured v1 base, or fall back.
const V1 = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const ROOT_URL = import.meta.env.VITE_API_ROOT_URL || V1.replace(/\/v1\/?$/, '');

const rootClient = axios.create({
  baseURL: ROOT_URL, // e.g. http://127.0.0.1:8000/api
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 30000,
});

rootClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

rootClient.interceptors.response.use(
  (r) => r,
  (error) => {
    const { response } = error;
    if (!response) return Promise.reject({ message: 'Network error.', status: 0 });
    const { status, data, config } = response;
    if (status === 401 && !config?.url?.includes('/auth/logout')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    if (status === 403) window.dispatchEvent(new CustomEvent('auth:forbidden'));
    return Promise.reject({ status, message: data?.message, errors: data?.errors || null, data });
  },
);

export default rootClient;
```

Keep this consistent with `axiosClient.js`'s interceptor behavior (token inject,
401 → `auth:logout`, 403 → `auth:forbidden`).

---

## 2. Backend endpoints (exact contract)

All require `Authorization: Bearer <token>` (Sanctum). Auth is already handled by
the interceptor.

### 2.1 Company — list matches for a job post
```
GET /api/jobs/{jobPostId}/matches
Role: company_owner | company_member (must own the job post; else 403)
Query params (all optional):
  min_score : number 0..1   (default 0.60)
  status    : new | viewed | shortlisted | auto_shortlisted | rejected
  per_page  : 1..100        (default 20)
Side effect: any returned matches with status "new" are flipped to "viewed".
```
Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "job_post_id": 1,
      "candidate_id": 4,
      "match_score": "0.8180",
      "score_breakdown": { "overall": 0.818 },
      "status": "auto_shortlisted",
      "matched_by": "cv_upload",
      "matched_at": "2026-06-20T21:50:32.000000Z",
      "notified_at": null,
      "created_at": "...", "updated_at": "...",
      "candidate": {
        "id": 4,
        "email": "test.candidate@talento.local",
        "google_drive_file_id": "1p_pNgt...",
        "job_seeker": { "user_id": 4, "first_name": "Test", "last_name": "Candidate" }
      }
    }
  ],
  "meta": { "current_page": 1, "per_page": 20, "total": 1, "last_page": 1 }
}
```
Notes:
- `match_score` is a **string** (e.g. `"0.8180"`) — `parseFloat` before display.
- Candidate display name = `candidate.job_seeker.first_name + ' ' + last_name`
  (there is **no** `candidate.name`); fall back to `candidate.email`.
- `candidate.job_seeker` may be `null` if the profile is incomplete — guard it.

### 2.2 Company — update a match status
```
PUT /api/jobs/{jobPostId}/matches/{matchId}
Role: company_owner | company_member (owns the job post)
Body: { "status": "shortlisted" | "rejected" | "new" }   // only these three allowed
404 if the match doesn't belong to that job post.
```
Response:
```json
{ "success": true, "data": { ...updated match row... } }
```
> The recruiter can set **shortlisted / rejected / new**. `viewed` and
> `auto_shortlisted` are system-assigned and not selectable.

### 2.3 Candidate — my matches
```
GET /api/candidate/matches
Role: job_seeker
Query params: per_page (1..100, default 20)
Only returns matches with score >= 0.60 (SCORE_SUGGEST), ordered by score desc.
```
Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 4, "job_post_id": 1, "candidate_id": 4,
      "match_score": "0.8180", "score_breakdown": { "overall": 0.818 },
      "status": "auto_shortlisted", "matched_by": "cv_upload",
      "matched_at": "...", "notified_at": null, "created_at": "...", "updated_at": "...",
      "job_post": {
        "id": 1, "title": "Senior Laravel Developer",
        "description": "...", "location": "Remote",
        "employment_type": "remote", "salary_min": "50.00", "salary_max": "1455.00",
        "company_id": 1,
        "company": { "id": 1, "name": "Acme", "logo_path": null }
      }
    }
  ],
  "meta": { "current_page": 1, "per_page": 20, "total": 5, "last_page": 1 }
}
```
Notes:
- Company logo field is `company.logo_path` (a storage path or null), **not** `logo_url`.
- Build the logo URL the same way the rest of the app builds storage URLs (check
  how `companyApi`/profile pages render `logo_path`); if there's no existing
  helper, fall back to initials.

---

## 3. Score tiers & status (shared semantics)

```
match_score (0..1):
  >= 0.80  → tier "auto_shortlisted"  → label "Top match"   → green
  >= 0.60  → tier "suggested"         → label "Suggested"   → blue
  <  0.60  → hidden (backend never returns these to candidates; company default
             min_score is 0.60 too)

status values: new | viewed | shortlisted | auto_shortlisted | rejected
  Badge mapping (reuse <Badge status=…>):
    new              → info       ("New")
    viewed           → default    ("Viewed")
    shortlisted      → success    ("Shortlisted")
    auto_shortlisted → success    ("Auto-shortlisted")
    rejected         → danger     ("Rejected")
```
Display score as a percentage: `Math.round(parseFloat(match_score) * 100)` → `82%`.

---

## 4. Deliverables

Follow existing patterns: `useFetch` hook, `useTranslation`, `PageHeader`,
`DataTable`, `Badge`, `Button`, `Pagination`, `Select`, `EmptyState`,
`ErrorState`, `ConfirmDialog`, `react-hot-toast`, `formatDate`/`extractPagination`
from `utils/formatters`, CSS variables (`var(--text-primary)` etc.), `card` class,
`animate-fade-in`, skeletons. Full dark-mode + RTL (Arabic) support.

### 4.1 `src/api/matchApi.js`
```js
import rootClient from './rootClient';

export const matchApi = {
  // Company
  getJobMatches: (jobPostId, params) =>
    rootClient.get(`/jobs/${jobPostId}/matches`, { params }),
  updateMatchStatus: (jobPostId, matchId, status) =>
    rootClient.put(`/jobs/${jobPostId}/matches/${matchId}`, { status }),
  // Candidate
  getMyMatches: (params) =>
    rootClient.get('/candidate/matches', { params }),
};
```

### 4.2 Company surface
- **New page** `src/pages/company/CompanyJobMatchesPage.jsx` at route
  `/company/job-posts/:id/matches`.
  - `PageHeader` with breadcrumb back to the job post; title "Candidate Matches".
  - Filters row: a **min score** `Select` (Any / 60% / 70% / 80% / 90%) and a
    **status** `Select` (All / New / Viewed / Shortlisted / Auto-shortlisted /
    Rejected) + a **Refresh** button (matching is async).
  - `DataTable` columns: Candidate (name + email), Match (score % + tier badge),
    Status badge, Matched date (`formatDate(matched_at)`), Actions.
  - Actions per row: **Shortlist** and **Reject** buttons (and "Reset to New").
    Use **optimistic update** + `toast.success`/`toast.error`; on failure, revert
    and refetch. Disable the button matching the current status.
  - `Pagination` driven by `meta` (use `extractPagination`).
  - Loading skeletons, `ErrorState` (with retry), `EmptyState` titled e.g.
    "No matches yet" / "Matching runs automatically after you publish — check back
    in a moment." with the Refresh affordance.
- **Entry point**: on `CompanyJobPostDetailPage.jsx`, add a button in the header
  actions (next to Edit): `Users`/`Sparkles` icon, label "Matches", navigates to
  `/company/job-posts/${id}/matches`. Optionally show the match count.

### 4.3 Candidate surface
- **New page** `src/pages/jobseeker/JobSeekerMatchesPage.jsx` at route
  `/job-seeker/matches`.
  - Card/grid list (not a heavy table) of matched jobs, ordered by score.
  - Each card: job title, company name + logo (or initials), location,
    employment type, salary range, **match score %** with tier badge
    ("Top match"/"Suggested"), matched date.
  - `Pagination`, loading skeletons, `ErrorState`, `EmptyState`
    ("No matches yet — upload/complete your CV and check back shortly.").
  - Read-only (no status actions for candidates).
- **Nav**: add to `JobSeekerLayout` `NAV_ITEMS` under "Activity":
  `{ to: '/job-seeker/matches', icon: Sparkles, label: 'Matches' }`
  (use an existing `lucide-react` icon, e.g. `Sparkles` or `Target`).

### 4.4 Routing (`src/routes/AppRouter.jsx`)
- Import the two new pages.
- Add under the **company** children:
  `{ path: 'job-posts/:id/matches', element: <CompanyJobMatchesPage /> }`
- Add under the **job-seeker** children:
  `{ path: 'matches', element: <JobSeekerMatchesPage /> }`

### 4.5 i18n (`src/i18n/en.json` AND `src/i18n/ar.json`)
Add two new top-level sections, fully translated in both files (mirror the
existing nesting style; provide Arabic translations):
```
"companyJobMatches": {
  "title": "Candidate Matches",
  "subtitle": "AI-ranked candidates for this job",
  "colCandidate": "Candidate", "colScore": "Match", "colStatus": "Status",
  "colMatched": "Matched", "filterMinScore": "Min score", "filterStatus": "Status",
  "refresh": "Refresh", "shortlist": "Shortlist", "reject": "Reject",
  "resetStatus": "Reset to New",
  "emptyTitle": "No matches yet",
  "emptyDesc": "Matching runs automatically after publishing — check back shortly.",
  "updated": "Match updated", "updateFailed": "Could not update match"
},
"jobSeekerMatches": {
  "title": "My Matches", "subtitle": "Jobs that match your profile",
  "topMatch": "Top match", "suggested": "Suggested",
  "emptyTitle": "No matches yet",
  "emptyDesc": "Complete your CV and check back shortly."
},
"matchStatus": {
  "new": "New", "viewed": "Viewed", "shortlisted": "Shortlisted",
  "auto_shortlisted": "Auto-shortlisted", "rejected": "Rejected"
}
```
Also add nav labels where you reference them (or use literals via `t`).
Note: existing `table.results` uses `{{from}}`, `{{to}}`, `{{total}}` — reuse it.

---

## 5. UX / behavior requirements
- **Async awareness**: never imply matches are instant. Empty state explains they
  appear after publish/CV processing; always provide a Refresh button.
- **Optimistic status updates** (company) with rollback on error + toast.
- **Score formatting**: percentage, integer rounded; tier badge alongside.
- **Guarding**: `candidate.job_seeker` and `company.logo_path` can be null.
- **Numbers as strings**: `match_score`, `salary_min/max` come as strings — parse.
- **RTL + dark mode**: use CSS variables and logical layout; verify in Arabic.
- **Role protection** is already enforced by `RoleRoute`; still, the candidate page
  must only ever call `getMyMatches` and the company page only the job routes.

---

## 6. Acceptance criteria
1. Company: from a job post, open **Matches**, see candidates ranked by score with
   correct % and tier/status badges; filtering by min score and status re-queries;
   pagination works.
2. Company: Shortlist/Reject updates the row immediately, persists (verify via
   refetch), and shows a toast; failures roll back.
3. Candidate: **My Matches** lists matched jobs (score ≥ 60%) ordered by score with
   company + job info; pagination works; read-only.
4. All three calls hit `/api/...` (root client), **not** `/api/v1/...`.
5. Empty/loading/error states present everywhere; works in English + Arabic (RTL)
   and light + dark themes.
6. No new dependencies; matches existing file structure and component usage.

---

## 7. Quick manual test
- Log in as a company user that owns a job with matches (e.g. job id 1) →
  `/company/job-posts/1/matches` should list the candidate(s).
- Log in as `test.candidate@talento.local` (job seeker) →
  `/job-seeker/matches` should list matched jobs.
