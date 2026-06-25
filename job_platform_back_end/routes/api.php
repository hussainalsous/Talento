<?php

use App\Http\Controllers\Api\V1\Admin\CompanyRequestController;
use App\Http\Controllers\Api\V1\Admin\CourseController as AdminCourseController;
use App\Http\Controllers\Api\V1\Admin\CvAdminController;
use App\Http\Controllers\Api\V1\Admin\SubscriptionController;
use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Auth\EmailVerificationController;
use App\Http\Controllers\Api\V1\Company\CandidateController;
use App\Http\Controllers\Api\V1\Company\InvitationController as CompanyInvitationController;
use App\Http\Controllers\Api\V1\Company\JobPostController as CompanyJobPostController;
use App\Http\Controllers\Api\V1\Company\MemberController;
use App\Http\Controllers\Api\V1\Company\ProfileController as CompanyProfileController;
use App\Http\Controllers\Api\MatchController;
use App\Http\Controllers\Api\N8nCallbackController;
use App\Http\Controllers\Api\V1\CourseController;
use App\Http\Controllers\Api\V1\JobPostController;
use App\Http\Controllers\Api\V1\N8nController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ResumeChunkController;
use App\Http\Controllers\Api\V1\JobSeeker\ApplicationController;
use App\Http\Controllers\Api\V1\JobSeeker\CvController;
use App\Http\Controllers\Api\V1\JobSeeker\InvitationController as JobSeekerInvitationController;
use App\Http\Controllers\Api\V1\JobSeeker\MatchingController;
use App\Http\Controllers\Api\V1\JobSeeker\ProfileController as JobSeekerProfileController;
use Illuminate\Support\Facades\Route;


/*
|--------------------------------------------------------------------------
| API Routes — Job Portal v1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->name('api.v1.')->group(function () {

    // =========================================================================
    // Health check (public)
    // =========================================================================
    Route::get('/ping', fn () => response()->json(['success' => true, 'message' => 'Job Portal API v1']));

    // =========================================================================
    // AUTH — Public
    // =========================================================================
    Route::prefix('auth')->name('auth.')->group(function () {
        // Job seeker self-registration
        Route::post('/job-seeker/register', [AuthController::class, 'registerJobSeeker'])
            ->name('job-seeker.register');

        // Company registration request (goes to admin for review)
        Route::post('/company-registration-requests', [AuthController::class, 'submitCompanyRegistration'])
            ->name('company-registration.submit');

        // Login for all roles
        Route::post('/login', [AuthController::class, 'login'])->name('login');

        // Forgot / reset password — public, throttled to curb abuse & enumeration
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
            ->middleware('throttle:6,1')
            ->name('password.forgot');

        Route::post('/reset-password', [AuthController::class, 'resetPassword'])
            ->middleware('throttle:6,1')
            ->name('password.reset');

        // Authenticated auth actions
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
            Route::get('/me', [AuthController::class, 'me'])->name('me');
            Route::patch('/password', [AuthController::class, 'updatePassword'])->name('password.update');
        });
    });

    // =========================================================================
    // EMAIL VERIFICATION
    // =========================================================================
    Route::prefix('email')->name('email.')->group(function () {
        // Verify user account email — signed URL, no auth required
        Route::get('/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
            ->name('verify');  // api.v1.email.verify

        // Verify company registration request email — signed URL, no auth required
        Route::get('/verify-registration/{id}/{hash}', [EmailVerificationController::class, 'verifyRegistration'])
            ->name('verify-registration');  // api.v1.email.verify-registration

        // Resend user verification — requires Sanctum auth + per-minute throttle
        Route::post('/verification-notification', [EmailVerificationController::class, 'resend'])
            ->middleware(['auth:sanctum', 'throttle:6,1'])
            ->name('resend');  // api.v1.email.resend
    });

    // =========================================================================
    // PUBLIC — Job Posts & Courses (no auth required)
    // =========================================================================
    Route::get('/job-posts', [JobPostController::class, 'index'])->name('job-posts.index');
    Route::get('/job-posts/{jobPost}', [JobPostController::class, 'show'])->name('job-posts.show');
    Route::get('/courses', [CourseController::class, 'index'])->name('courses.index');

    // =========================================================================
    // ADMIN ROUTES — role:admin
    // =========================================================================
    Route::middleware(['auth:sanctum', 'role:admin'])
        ->prefix('admin')
        ->name('admin.')
        ->group(function () {

            // --- Users ---
            Route::get('/users', [AdminUserController::class, 'index'])->name('users.index');
            Route::get('/users/{user}', [AdminUserController::class, 'show'])->name('users.show');
            Route::patch('/users/{user}/activate', [AdminUserController::class, 'activate'])->name('users.activate');
            Route::patch('/users/{user}/deactivate', [AdminUserController::class, 'deactivate'])->name('users.deactivate');

            // --- System Employees (Admins) ---
            Route::post('/system-employees', [AdminUserController::class, 'createSystemEmployee'])
                ->name('system-employees.store');
            Route::patch('/system-employees/{admin}/permissions', [AdminUserController::class, 'updatePermissions'])
                ->name('system-employees.permissions');

            // --- Company Registration Requests ---
            Route::get('/company-registration-requests', [CompanyRequestController::class, 'index'])
                ->name('company-requests.index');
            Route::get('/redis/company-registration-requests', [CompanyRequestController::class, 'redisIndex'])
                ->name('company-requests.redis-index');
            Route::get('/company-registration-requests/{companyRegistrationRequest}', [CompanyRequestController::class, 'show'])
                ->name('company-requests.show');
            Route::patch('/company-registration-requests/{companyRegistrationRequest}/approve', [CompanyRequestController::class, 'approve'])
                ->name('company-requests.approve');
            Route::patch('/company-registration-requests/{companyRegistrationRequest}/reject', [CompanyRequestController::class, 'reject'])
                ->name('company-requests.reject');

            // --- CVs ---
            Route::get('/cvs/{cv}', [CvAdminController::class, 'show'])->name('cvs.show');
            Route::delete('/cvs/{cv}', [CvAdminController::class, 'destroy'])->name('cvs.destroy');

            // --- Candidate oversight (admin bypasses all privacy filters) ---
            Route::get('/candidates', [CandidateController::class, 'index'])->name('candidates.index');
            Route::get('/candidates/{jobSeeker}', [CandidateController::class, 'show'])->name('candidates.show');

            // --- Subscriptions & Plans ---
            Route::get('/plans', [SubscriptionController::class, 'plans'])->name('plans.index');
            Route::get('/subscriptions', [SubscriptionController::class, 'index'])->name('subscriptions.index');
            Route::post('/companies/{company}/subscriptions', [SubscriptionController::class, 'assign'])
                ->name('subscriptions.assign');

            // --- Courses CRUD ---
            Route::apiResource('/courses', AdminCourseController::class)->names([
                'index'   => 'courses.index',
                'store'   => 'courses.store',
                'show'    => 'courses.show',
                'update'  => 'courses.update',
                'destroy' => 'courses.destroy',
            ]);
        });

    // =========================================================================
    // COMPANY ROUTES — role:company_owner, company_member
    // =========================================================================
    Route::middleware(['auth:sanctum', 'role:company_owner,company_member'])
        ->prefix('company')
        ->name('company.')
        ->group(function () {

            // --- Profile ---
            Route::get('/profile', [CompanyProfileController::class, 'show'])->name('profile.show');
            Route::patch('/profile', [CompanyProfileController::class, 'update'])->name('profile.update');
            Route::post('/logo', [CompanyProfileController::class, 'uploadLogo'])->name('logo.upload');

            // --- Members (owner only enforced at service/policy level) ---
            Route::get('/members', [MemberController::class, 'index'])->name('members.index');
            Route::post('/members', [MemberController::class, 'store'])->name('members.store');
            Route::patch('/members/{companyMember}', [MemberController::class, 'update'])->name('members.update');
            Route::delete('/members/{companyMember}', [MemberController::class, 'destroy'])->name('members.destroy');

            // --- Job Posts ---
            Route::get('/job-posts', [CompanyJobPostController::class, 'index'])->name('job-posts.index');
            Route::post('/job-posts', [CompanyJobPostController::class, 'store'])->name('job-posts.store');
            Route::get('/job-posts/{jobPost}', [CompanyJobPostController::class, 'show'])->name('job-posts.show');
            Route::patch('/job-posts/{jobPost}', [CompanyJobPostController::class, 'update'])->name('job-posts.update');
            Route::delete('/job-posts/{jobPost}', [CompanyJobPostController::class, 'destroy'])->name('job-posts.destroy');
            Route::get('/job-posts/{jobPost}/applicants', [CompanyJobPostController::class, 'applicants'])
                ->name('job-posts.applicants');

            // --- Application status management ---
            Route::patch('/applications/{jobApplication}/status', [CompanyJobPostController::class, 'updateApplicationStatus'])
                ->name('applications.status');

            // --- Candidate Search ---
            Route::get('/candidates', [CandidateController::class, 'index'])->name('candidates.index');
            Route::get('/candidates/{jobSeeker}', [CandidateController::class, 'show'])->name('candidates.show');
            Route::post('/candidates/{jobSeeker}/request-cv-access', [CandidateController::class, 'requestCvAccess'])
                ->name('candidates.request-cv-access');

            // --- Invitations ---
            Route::get('/invitations', [CompanyInvitationController::class, 'index'])->name('invitations.index');
            Route::post('/invitations', [CompanyInvitationController::class, 'store'])->name('invitations.store');
        });

    // =========================================================================
    // JOB SEEKER ROUTES — role:job_seeker
    // =========================================================================
    Route::middleware(['auth:sanctum', 'role:job_seeker'])
        ->prefix('job-seeker')
        ->name('job-seeker.')
        ->group(function () {

            // --- Profile ---
            Route::get('/profile', [JobSeekerProfileController::class, 'show'])->name('profile.show');
            Route::patch('/profile', [JobSeekerProfileController::class, 'update'])->name('profile.update');
            Route::patch('/privacy', [JobSeekerProfileController::class, 'updatePrivacy'])->name('privacy.update');
            // --- CVs ---
            Route::get('/cvs', [CvController::class, 'index'])->name('cvs.index');
            Route::post('/cvs', [CvController::class, 'store'])->middleware('verified')->name('cvs.store');
            Route::patch('/cvs/{cv}', [CvController::class, 'update'])->name('cvs.update');
            Route::delete('/cvs/{cv}', [CvController::class, 'destroy'])->name('cvs.destroy');
            Route::post('/cvs/{cv}/analyze', [CvController::class, 'analyze'])->name('cvs.analyze');

            // --- Applications ---
            Route::get('/applications', [ApplicationController::class, 'index'])->name('applications.index');
            Route::get('/applications/{jobApplication}', [ApplicationController::class, 'show'])->name('applications.show');
            Route::patch('/applications/{jobApplication}/withdraw', [ApplicationController::class, 'withdraw'])
                ->name('applications.withdraw');

            // --- Invitations ---
            Route::get('/invitations', [JobSeekerInvitationController::class, 'index'])->name('invitations.index');
            Route::patch('/invitations/{invitation}/respond', [JobSeekerInvitationController::class, 'respond'])
                ->name('invitations.respond');

            // --- Courses ---
            Route::get('/recommended-courses', [CourseController::class, 'recommended'])
                ->name('courses.recommended');

            // --- Matching ---
            Route::get('/suitable-jobs', [MatchingController::class, 'suitableJobs'])
                ->name('suitable-jobs');
        });

    // =========================================================================
    // NOTIFICATIONS — all authenticated roles
    // =========================================================================
    Route::middleware('auth:sanctum')
        ->prefix('notifications')
        ->name('notifications.')
        ->group(function () {
            Route::get('/',           [NotificationController::class, 'index'])        ->name('index');
            Route::get('/unread-count', [NotificationController::class, 'unreadCount'])->name('unread-count');
            // read-all must be defined before {id}/read to avoid route conflicts
            Route::patch('/read-all', [NotificationController::class, 'markAllAsRead'])->name('read-all');
            Route::patch('/{id}/read', [NotificationController::class, 'markAsRead'])  ->name('read');
            Route::delete('/{id}',    [NotificationController::class, 'destroy'])      ->name('destroy');
        });

    // =========================================================================
    // MIXED AUTH — Actions on job posts by authenticated job seekers
    // =========================================================================
    Route::middleware(['auth:sanctum', 'role:job_seeker'])->group(function () {
        Route::post('/job-posts/{jobPost}/apply', [ApplicationController::class, 'apply'])
            ->middleware('verified')
            ->name('job-posts.apply');
    });

    // =========================================================================
    // INTEGRATIONS — n8n CV embedding pipeline (service-token authenticated)
    // =========================================================================
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/resumes/chunks',     [ResumeChunkController::class, 'storeChunk'])    ->name('resumes.chunks.store');
        Route::post('/resumes/embeddings', [ResumeChunkController::class, 'storeEmbedding'])->name('resumes.embeddings.store');
        Route::post('/n8n/log-error',      [N8nController::class, 'logError'])              ->name('n8n.log-error');
    });

    // CV upload routes — job seeker only
    Route::middleware(['auth:sanctum', 'role:job_seeker'])->group(function () {
        // Flutter sends PDF binary → Laravel uploads to Drive → triggers n8n cv-ingest
        Route::post('/resumes/upload',      [CvController::class, 'upload'])     ->name('resumes.upload');
        // Flutter already uploaded to Drive → sends Drive file ID → triggers n8n cv-match
        Route::post('/resumes/register-cv', [CvController::class, 'registerCv'])->name('resumes.register-cv');
    });
});

/*
|--------------------------------------------------------------------------
| Job ↔ Candidate Matching
|--------------------------------------------------------------------------
| Registered outside the v1 group so the n8n callback route names stay bare
| (n8n.*) — the embedding pipeline resolves them via URL::route('n8n.*').
|
| NOTE: this project has no 'company' / 'candidate' roles. The role values are
| company_owner / company_member and job_seeker, so the matching routes use
| those via the existing `role` middleware.
*/

// n8n → Laravel callbacks (secured by the shared webhook secret).
Route::prefix('n8n')->name('n8n.')->middleware('n8n.secret')->group(function () {
    Route::post('job-embedding/done', [N8nCallbackController::class, 'jobEmbeddingDone'])->name('job-embedding.done');
    Route::post('match/done',         [N8nCallbackController::class, 'matchDone'])       ->name('match.done');
    Route::post('log-error',          [N8nCallbackController::class, 'logError'])        ->name('log-error');
});

// Company recruiters — view & act on candidate matches for their job posts.
Route::middleware(['auth:sanctum', 'role:company_owner,company_member'])->group(function () {
    Route::get('/jobs/{jobPost}/matches',          [MatchController::class, 'index'])      ->name('jobs.matches.index');
    Route::put('/jobs/{jobPost}/matches/{match}',  [MatchController::class, 'updateStatus'])->name('jobs.matches.update');
});

// Candidates (job seekers) — view their own job matches.
Route::middleware(['auth:sanctum', 'role:job_seeker'])->group(function () {
    Route::get('/candidate/matches', [MatchController::class, 'candidateMatches'])->name('candidate.matches');
});
