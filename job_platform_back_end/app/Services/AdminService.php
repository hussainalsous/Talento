<?php

namespace App\Services;

use App\Jobs\SendEmail;
use App\Mail\SystemNotificationEmail;
use App\Models\Admin;
use App\Models\Company;
use App\Models\CompanyMember;
use App\Models\CompanyRegistrationRequest;
use App\Models\CV;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class AdminService
{
    // Cache TTLs (seconds)
    private const TTL_USERS    = 120;
    private const TTL_REQUESTS = 30;
    private const TTL_PLANS    = 3600;

    public function __construct(
        private readonly SupabaseNotificationService $notifications,
        private readonly RedisCacheService $cache,
    ) {}

    // -------------------------------------------------------------------------
    // Users
    // -------------------------------------------------------------------------

    public function listUsers(array $filters): LengthAwarePaginator
    {
        $key = $this->cache->filterKey('admin:users', array_merge(
            ['page' => request()->input('page', 1)],
            $filters
        ));

        $cached = $this->cache->get($key);

        if ($cached !== null) {
            return new LengthAwarePaginator(
                User::hydrate($cached['data']),
                $cached['total'],
                $cached['per_page'],
                $cached['current_page'],
            );
        }

        $query = User::query();

        if (!empty($filters['role'])) {
            $query->where('role', $filters['role']);
        }

        if (!empty($filters['search'])) {
            $term = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($term) {
                $q->where('email', 'like', $term)
                  ->orWhere('phone', 'like', $term)
                  ->orWhereHas('admin', fn ($a) => $a->where('first_name', 'like', $term)->orWhere('last_name', 'like', $term))
                  ->orWhereHas('jobSeeker', fn ($j) => $j->where('first_name', 'like', $term)->orWhere('last_name', 'like', $term))
                  ->orWhereHas('companyMember', fn ($c) => $c->where('first_name', 'like', $term)->orWhere('last_name', 'like', $term));
            });
        }

        if (isset($filters['is_active']) && $filters['is_active'] !== '') {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        $paginator = $query->latest()->paginate($filters['per_page'] ?? 20);

        $this->cache->set($key, [
            'data'         => $paginator->items(),
            'total'        => $paginator->total(),
            'per_page'     => $paginator->perPage(),
            'current_page' => $paginator->currentPage(),
        ], self::TTL_USERS);

        return $paginator;
    }

    public function activateUser(User $user): void
    {
        $user->update(['is_active' => true]);

        $this->cache->delPattern('admin:users:*');

        $this->notifications->createNotification(
            userId: (int) $user->id,
            title: 'Account Activated',
            message: 'Your account has been activated. You can now log in.',
            data: ['type' => 'account_activated', 'user_id' => $user->id],
        );
    }

    public function deactivateUser(User $user): void
    {
        $user->update(['is_active' => false]);
        $user->tokens()->delete();

        $this->cache->delPattern('admin:users:*');

        $this->notifications->createNotification(
            userId: (int) $user->id,
            title: 'Account Deactivated',
            message: 'Your account has been deactivated. Contact support if you believe this is a mistake.',
            data: ['type' => 'account_deactivated', 'user_id' => $user->id],
        );
    }

    // -------------------------------------------------------------------------
    // System employees (admins)
    // -------------------------------------------------------------------------

    public function createSystemEmployee(array $data): array
    {
        $result = DB::transaction(function () use ($data) {
            $user = User::create([
                'email'     => $data['email'],
                'phone'     => $data['phone'] ?? null,
                'password'  => Hash::make($data['password']),
                'role'      => 'admin',
                'is_active' => true,
            ]);

            $admin = Admin::create([
                'user_id'     => $user->id,
                'first_name'  => $data['first_name'],
                'last_name'   => $data['last_name'],
                'permissions' => $data['permissions'] ?? [],
            ]);

            return compact('user', 'admin');
        });

        $this->cache->delPattern('admin:users:*');

        $this->notifications->createNotification(
            userId: (int) $result['user']->id,
            title: 'Admin Account Created',
            message: "Welcome {$result['admin']->first_name}! Your admin account has been created. You can now log in.",
            data: [
                'type'     => 'admin_account_created',
                'user_id'  => $result['user']->id,
                'admin_id' => $result['admin']->id,
            ],
        );

        return $result;
    }

    public function updateAdminPermissions(Admin $admin, array $permissions): Admin
    {
        $admin->update(['permissions' => $permissions]);
        $updated = $admin->fresh();

        $this->notifications->createNotification(
            userId: (int) $updated->user_id,
            title: 'Permissions Updated',
            message: 'Your admin permissions have been updated by a super admin.',
            data: [
                'type'        => 'admin_permissions_updated',
                'admin_id'    => $updated->id,
                'permissions' => $permissions,
            ],
        );

        return $updated;
    }

    // -------------------------------------------------------------------------
    // Company registration requests
    // -------------------------------------------------------------------------

    public function listRegistrationRequests(array $filters): LengthAwarePaginator
    {
        $key = $this->cache->filterKey('admin:company_requests', array_merge(
            ['page' => request()->input('page', 1)],
            $filters
        ));

        $cached = $this->cache->get($key);

        if ($cached !== null) {
            return new LengthAwarePaginator(
                CompanyRegistrationRequest::hydrate($cached['data']),
                $cached['total'],
                $cached['per_page'],
                $cached['current_page'],
            );
        }

        $query = CompanyRegistrationRequest::query();

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $term = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($term) {
                $q->where('company_name', 'like', $term)
                  ->orWhere('registration_number', 'like', $term)
                  ->orWhere('requester_first_name', 'like', $term)
                  ->orWhere('requester_last_name', 'like', $term)
                  ->orWhere('requester_email', 'like', $term);
            });
        }

        $paginator = $query->latest()->paginate($filters['per_page'] ?? 20);

        $this->cache->set($key, [
            'data'         => $paginator->items(),
            'total'        => $paginator->total(),
            'per_page'     => $paginator->perPage(),
            'current_page' => $paginator->currentPage(),
        ], self::TTL_REQUESTS);

        return $paginator;
    }

    public function invalidateRequestsCache(): void
    {
        $this->cache->delPattern('admin:company_requests:*');
    }

    public function approveRegistrationRequest(
        CompanyRegistrationRequest $registrationRequest,
        User $reviewingUser
    ): array {
        if (!$registrationRequest->isPending()) {
            abort(409, 'This request has already been reviewed.');
        }

        $admin = Admin::firstOrCreate(
            ['user_id' => $reviewingUser->id],
            ['first_name' => 'Admin', 'last_name' => '', 'permissions' => ['*']]
        );

        $transactionResult = DB::transaction(function () use ($registrationRequest, $admin) {
            $user = User::create([
                'email'             => $registrationRequest->requester_email,
                'phone'             => $registrationRequest->requester_phone,
                'password'          => $registrationRequest->getRawOriginal('password'),
                'role'              => 'company_owner',
                'is_active'         => true,
                // Transfer pre-verification status: if the requester verified their email
                // before admin review, carry that timestamp over — no second email needed.
                // null means not yet verified; the notification below will send the link.
                'email_verified_at' => $registrationRequest->email_verified_at,
            ]);

            $company = Company::create([
                'owner_user_id'       => $user->id,
                'name'                => $registrationRequest->company_name,
                'registration_number' => $registrationRequest->registration_number,
                'website'             => $registrationRequest->website,
                'address'             => $registrationRequest->address,
                'country'             => $registrationRequest->country,
                'description'         => $registrationRequest->description,
                'logo_path'           => $registrationRequest->logo_path,
                'approval_status'     => 'approved',
                'approved_by'         => $admin->id,
                'approved_at'         => now(),
            ]);

            CompanyMember::create([
                'user_id'         => $user->id,
                'company_id'      => $company->id,
                'first_name'      => $registrationRequest->requester_first_name,
                'last_name'       => $registrationRequest->requester_last_name,
                'role_in_company' => 'owner',
            ]);

            $registrationRequest->update([
                'status'      => 'approved',
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'company_id'  => $company->id,
            ]);

            return compact('company', 'user');
        });

        $company          = $transactionResult['company'];
        $companyOwnerUser = $transactionResult['user'];

        // Invalidate both caches — a new user was created and a request status changed
        $this->cache->delPattern('admin:company_requests:*');
        $this->cache->delPattern('admin:users:*');

        // [DEBUG] — remove after confirming notification ownership is correct
        Log::debug('[Approval] new company owner user created', [
            'new_user_id'      => $company->owner_user_id,
            'company_name'     => $company->name,
            'requester_email'  => $registrationRequest->requester_email,
        ]);

        // Purge any stale Supabase notifications for this user_id before inserting the
        // approval notification. Guards against MySQL auto_increment ID reuse after a
        // database reset in dev/staging; is a no-op in production.
        $this->notifications->deleteAllForUser((int) $company->owner_user_id);

        $this->notifications->createNotification(
            userId: (int) $company->owner_user_id,
            title: 'Company Registration Approved',
            message: "Your company \"{$company->name}\" has been approved. You can now log in.",
            data: [
                'type'         => 'company_approved',
                'company_id'   => $company->id,
                'company_name' => $company->name,
            ],
        );

        $alreadyVerified = $registrationRequest->hasVerifiedEmail();

        $approvalMessage = $alreadyVerified
            ? "Hi {$registrationRequest->requester_first_name},\n\n"
                . "Congratulations! Your company registration request for {$registrationRequest->company_name} has been approved successfully.\n\n"
                . "Your email address has already been verified. You can now log in and access all platform features including posting jobs, managing applicants, and your company dashboard.\n\n"
                . "Thank you for joining our platform."
            : "Hi {$registrationRequest->requester_first_name},\n\n"
                . "Congratulations! Your company registration request for {$registrationRequest->company_name} has been approved successfully.\n\n"
                . "To complete your account setup, please verify your email address by clicking the link in the separate verification email we are sending to this address now.\n\n"
                . "Once verified, you can log in and access all platform features including posting jobs, managing applicants, and your company dashboard.\n\n"
                . "Thank you for joining our platform.";

        SendEmail::dispatch(
            recipient: $registrationRequest->requester_email,
            mailable: new SystemNotificationEmail(
                title: 'Company Registration Approved',
                message: $approvalMessage,
            ),
            log: [
                'subject' => 'Company Registration Approved',
                'body'    => "Company {$company->name} approved.",
                'id'      => $reviewingUser->id,
            ]
        );

        // Only send a verification email if the requester did not pre-verify.
        // Pre-verified status was already transferred to email_verified_at on User::create().
        if (! $alreadyVerified) {
            $companyOwnerUser->sendEmailVerificationNotification();
        }

        return compact('company', 'admin');
    }

    public function rejectRegistrationRequest(
        CompanyRegistrationRequest $registrationRequest,
        User $reviewingUser,
        string $reason
    ): CompanyRegistrationRequest {
        if (!$registrationRequest->isPending()) {
            abort(409, 'This request has already been reviewed.');
        }

        $admin = Admin::firstOrCreate(
            ['user_id' => $reviewingUser->id],
            ['first_name' => 'Admin', 'last_name' => '', 'permissions' => ['*']]
        );

        $registrationRequest->update([
            'status'           => 'rejected',
            'reviewed_by'      => $admin->id,
            'reviewed_at'      => now(),
            'rejection_reason' => $reason,
        ]);

        if ($registrationRequest->logo_path) {
            Storage::disk('public')->delete($registrationRequest->logo_path);
        }

        $this->cache->delPattern('admin:company_requests:*');

        $rejectionMessage = "Hi {$registrationRequest->requester_first_name},\n\n"
            . "Thank you for submitting your company registration request for {$registrationRequest->company_name}.\n\n"
            . "After careful review by our team, we regret to inform you that your registration request could not be approved at this time.";

        if (trim($reason) !== '') {
            $rejectionMessage .= "\n\nReason: {$reason}";
        }

        $rejectionMessage .= "\n\nIf you have any questions regarding this decision, or if you would like to submit a new registration request after addressing the noted concerns, please do not hesitate to contact our support team.\n\n"
            . "We appreciate your interest in the Talento platform.";

        SendEmail::dispatch(
            recipient: $registrationRequest->requester_email,
            mailable: new SystemNotificationEmail(
                title: 'Company Registration Request Rejected',
                message: $rejectionMessage,
            ),
            log: [
                'subject' => 'Company Registration Request Rejected',
                'body'    => "Registration request for {$registrationRequest->company_name} rejected."
                    . (trim($reason) !== '' ? " Reason: {$reason}" : ''),
                'id'      => $reviewingUser->id,
            ]
        );

        return $registrationRequest->fresh();
    }

    // -------------------------------------------------------------------------
    // CVs
    // -------------------------------------------------------------------------

    public function deleteCV(CV $cv): void
    {
        $cv->load('jobSeeker');
        $jobSeekerUserId = $cv->jobSeeker?->user_id;
        $cvId            = $cv->id;
        $cvTitle         = $cv->title ?? 'CV';

        if ($cv->file_path) {
            Storage::disk('public')->delete($cv->file_path);
        }
        $cv->forceDelete();

        if ($jobSeekerUserId) {
            $this->notifications->createNotification(
                userId: (int) $jobSeekerUserId,
                title: 'CV Removed by Admin',
                message: "Your CV \"{$cvTitle}\" has been removed by an administrator.",
                data: ['type' => 'cv_deleted_by_admin', 'cv_id' => $cvId],
            );
        }
    }

    // -------------------------------------------------------------------------
    // Subscriptions & Plans
    // -------------------------------------------------------------------------

    public function listPlans(): \Illuminate\Database\Eloquent\Collection
    {
        $cached = $this->cache->get('admin:plans');

        if ($cached !== null) {
            return Plan::hydrate($cached);
        }

        $plans = Plan::where('is_active', true)->get();

        $this->cache->set('admin:plans', $plans->toArray(), self::TTL_PLANS);

        return $plans;
    }

    public function assignSubscription(Company $company, array $data): Subscription
    {
        $subscription = DB::transaction(function () use ($company, $data) {
            $company->subscriptions()->where('status', 'active')->update(['status' => 'cancelled']);

            return Subscription::create([
                'company_id' => $company->id,
                'plan_id'    => $data['plan_id'],
                'status'     => $data['status'] ?? 'active',
                'starts_at'  => $data['starts_at'] ?? now(),
                'ends_at'    => $data['ends_at'] ?? null,
            ]);
        });

        $subscription->load('plan');

        $this->notifications->createNotification(
            userId: (int) $company->owner_user_id,
            title: 'Subscription Assigned',
            message: "Your company \"{$company->name}\" has been assigned the \"{$subscription->plan->name}\" plan.",
            data: [
                'type'            => 'subscription_assigned',
                'company_id'      => $company->id,
                'subscription_id' => $subscription->id,
                'plan_id'         => $subscription->plan_id,
            ],
        );

        return $subscription;
    }

    public function listSubscriptions(array $filters): LengthAwarePaginator
    {
        return Subscription::with(['company', 'plan'])
            ->when(!empty($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(!empty($filters['company_id']), fn ($q) => $q->where('company_id', $filters['company_id']))
            ->latest()
            ->paginate($filters['per_page'] ?? 20);
    }
}
