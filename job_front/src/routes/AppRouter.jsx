import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { GuestRoute } from './GuestRoute';

/* Layouts */
import { AuthLayout }      from '../layouts/AuthLayout';
import { AdminLayout }     from '../layouts/AdminLayout';
import { CompanyLayout }   from '../layouts/CompanyLayout';
import { JobSeekerLayout } from '../layouts/JobSeekerLayout';

/* Landing page */
import { LandingPage }       from '../pages/landing/LandingPage';
import { MobileAppInfoPage } from '../pages/landing/MobileAppInfoPage';

/* Auth pages */
import { LoginPage }          from '../pages/auth/LoginPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage }  from '../pages/auth/ResetPasswordPage';
import { UnauthorizedPage }   from '../pages/auth/UnauthorizedPage';
import { NotFoundPage }       from '../pages/auth/NotFoundPage';

/* Email verification pages */
import { VerifyPendingPage }               from '../pages/auth/VerifyPendingPage';
import { EmailVerifiedPage }               from '../pages/auth/EmailVerifiedPage';
import { EmailAlreadyVerifiedPage }        from '../pages/auth/EmailAlreadyVerifiedPage';
import { EmailVerificationExpiredPage }    from '../pages/auth/EmailVerificationExpiredPage';
import { EmailVerificationInvalidPage }    from '../pages/auth/EmailVerificationInvalidPage';

/* Admin pages */
import { AdminDashboardPage }       from '../pages/admin/AdminDashboardPage';
import { AdminNotificationsPage }   from '../pages/admin/AdminNotificationsPage';
import { AdminUsersPage }           from '../pages/admin/AdminUsersPage';
import { AdminUserDetailPage }      from '../pages/admin/AdminUserDetailPage';
import { AdminCompanyRequestsPage } from '../pages/admin/AdminCompanyRequestsPage';
import { AdminCompanyRequestDetailPage } from '../pages/admin/AdminCompanyRequestDetailPage';
import { AdminCompaniesPage }       from '../pages/admin/AdminCompaniesPage';
import { AdminCompanyDetailPage }   from '../pages/admin/AdminCompanyDetailPage';
import { AdminEmployeesPage }       from '../pages/admin/AdminEmployeesPage';
import { AdminCVsPage }             from '../pages/admin/AdminCVsPage';
import { AdminCoursesPage }         from '../pages/admin/AdminCoursesPage';
import { AdminSettingsPage }        from '../pages/admin/AdminSettingsPage';

/* Job Seeker pages */
import { JobSeekerProfilePage }        from '../pages/jobseeker/JobSeekerProfilePage';
import { JobSeekerNotificationsPage }  from '../pages/jobseeker/JobSeekerNotificationsPage';
import { JobSeekerMatchesPage }        from '../pages/jobseeker/JobSeekerMatchesPage';

/* Company pages */
import { CompanyDashboardPage }   from '../pages/company/CompanyDashboardPage';
import { CompanyNotificationsPage } from '../pages/company/CompanyNotificationsPage';
import { CompanyProfilePage }     from '../pages/company/CompanyProfilePage';
import { CompanyMembersPage }     from '../pages/company/CompanyMembersPage';
import { CompanyJobPostsPage }    from '../pages/company/CompanyJobPostsPage';
import { CompanyJobPostNewPage }  from '../pages/company/CompanyJobPostNewPage';
import { CompanyJobPostDetailPage } from '../pages/company/CompanyJobPostDetailPage';
import { CompanyJobMatchesPage }   from '../pages/company/CompanyJobMatchesPage';
import { CompanyJobPostEditPage } from '../pages/company/CompanyJobPostEditPage';
import { CompanyApplicantsPage }  from '../pages/company/CompanyApplicantsPage';
import { CompanyApplicationDetailPage } from '../pages/company/CompanyApplicationDetailPage';
import { CompanyCandidatesPage }  from '../pages/company/CompanyCandidatesPage';
import { CompanyCandidateDetailPage } from '../pages/company/CompanyCandidateDetailPage';
import { CompanyInvitationsPage } from '../pages/company/CompanyInvitationsPage';
import { CompanyCoursesPage }     from '../pages/company/CompanyCoursesPage';
import { CompanySettingsPage }    from '../pages/company/CompanySettingsPage';

const ADMIN_ROLES       = ['admin', 'super_admin'];
const COMPANY_ROLES     = ['company_owner', 'company_member'];
const JOB_SEEKER_ROLES  = ['job_seeker'];

const router = createBrowserRouter([
  /* ── Landing page (public) ───────────────────────────── */
  { path: '/',                   element: <LandingPage /> },
  { path: '/job-seeker/welcome', element: <MobileAppInfoPage /> },

  /* ── Guest-only routes ────────────────────────────────── */
  {
    element: <AuthLayout />,
    children: [
      { path: '/login',           element: <GuestRoute><LoginPage /></GuestRoute> },
      { path: '/forgot-password', element: <GuestRoute><ForgotPasswordPage /></GuestRoute> },
      { path: '/reset-password',  element: <GuestRoute><ResetPasswordPage /></GuestRoute> },
    ],
  },

  /* ── Public error routes ──────────────────────────────── */
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  { path: '*',             element: <NotFoundPage /> },

  /* ── Email verification routes (public, no auth required) ── */
  { path: '/verify-pending',               element: <VerifyPendingPage /> },
  { path: '/email-verified',               element: <EmailVerifiedPage /> },
  { path: '/email-already-verified',       element: <EmailAlreadyVerifiedPage /> },
  { path: '/email-verification-expired',   element: <EmailVerificationExpiredPage /> },
  { path: '/email-verification-invalid',   element: <EmailVerificationInvalidPage /> },

  /* ── Admin routes ─────────────────────────────────────── */
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <RoleRoute roles={ADMIN_ROLES}>
          <AdminLayout />
        </RoleRoute>
      </ProtectedRoute>
    ),
    children: [
      { index: true,                element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard',          element: <AdminDashboardPage /> },
      { path: 'users',              element: <AdminUsersPage /> },
      { path: 'users/:id',          element: <AdminUserDetailPage /> },
      { path: 'company-requests',   element: <AdminCompanyRequestsPage /> },
      { path: 'company-requests/:id', element: <AdminCompanyRequestDetailPage /> },
      { path: 'companies',          element: <AdminCompaniesPage /> },
      { path: 'companies/:id',      element: <AdminCompanyDetailPage /> },
      { path: 'employees',          element: <AdminEmployeesPage /> },
      { path: 'cvs',                element: <AdminCVsPage /> },
      { path: 'courses',            element: <AdminCoursesPage /> },
      { path: 'settings',           element: <AdminSettingsPage /> },
      { path: 'notifications',      element: <AdminNotificationsPage /> },
    ],
  },

  /* ── Job Seeker routes ────────────────────────────────── */
  {
    path: '/job-seeker',
    element: (
      <ProtectedRoute>
        <RoleRoute roles={JOB_SEEKER_ROLES}>
          <JobSeekerLayout />
        </RoleRoute>
      </ProtectedRoute>
    ),
    children: [
      { index: true,            element: <Navigate to="/job-seeker/profile" replace /> },
      { path: 'profile',        element: <JobSeekerProfilePage /> },
      { path: 'matches',        element: <JobSeekerMatchesPage /> },
      { path: 'notifications',  element: <JobSeekerNotificationsPage /> },
    ],
  },

  /* ── Company routes ───────────────────────────────────── */
  {
    path: '/company',
    element: (
      <ProtectedRoute>
        <RoleRoute roles={COMPANY_ROLES}>
          <CompanyLayout />
        </RoleRoute>
      </ProtectedRoute>
    ),
    children: [
      { index: true,                   element: <Navigate to="/company/dashboard" replace /> },
      { path: 'dashboard',             element: <CompanyDashboardPage /> },
      { path: 'profile',               element: <CompanyProfilePage /> },
      { path: 'members',               element: <CompanyMembersPage /> },
      { path: 'job-posts',             element: <CompanyJobPostsPage /> },
      { path: 'job-posts/new',         element: <CompanyJobPostNewPage /> },
      { path: 'job-posts/:id',         element: <CompanyJobPostDetailPage /> },
      { path: 'job-posts/:id/matches', element: <CompanyJobMatchesPage /> },
      { path: 'job-posts/:id/edit',    element: <CompanyJobPostEditPage /> },
      { path: 'applicants',            element: <CompanyApplicantsPage /> },
      { path: 'applicants/:id',        element: <CompanyApplicationDetailPage /> },
      { path: 'candidates',            element: <CompanyCandidatesPage /> },
      { path: 'candidates/:id',        element: <CompanyCandidateDetailPage /> },
      { path: 'invitations',           element: <CompanyInvitationsPage /> },
      { path: 'courses',               element: <CompanyCoursesPage /> },
      { path: 'settings',              element: <CompanySettingsPage /> },
      { path: 'notifications',         element: <CompanyNotificationsPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
