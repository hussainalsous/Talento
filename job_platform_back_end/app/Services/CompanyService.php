<?php

namespace App\Services;

use App\Events\JobPostPublished;
use App\Models\Company;
use App\Models\CompanyMember;
use App\Models\JobApplication;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Services\RedisCacheService;

class CompanyService
{
    private const TTL_JOB_POSTS = 120;

    public function __construct(
        private readonly SupabaseNotificationService $notifications,
        private readonly RedisCacheService $cache,
    ) {}

    // -------------------------------------------------------------------------
    // Company Profile
    // -------------------------------------------------------------------------

    public function getCompanyForUser(User $user): Company
    {
        return $user->companyMember->company ?? abort(404, 'Company not found.');
    }

    public function updateProfile(Company $company, array $data): Company
    {
        $company->update(array_filter($data, fn ($v) => $v !== null));
        $updated = $company->fresh();

        $this->notifications->createNotification(
            userId: (int) $updated->owner_user_id,
            title: 'Company Profile Updated',
            message: "Your company profile for \"{$updated->name}\" has been updated.",
            data: [
                'type'       => 'company_profile_updated',
                'company_id' => $updated->id,
            ]
        );

        return $updated;
    }

    public function uploadLogo(Company $company, $file): Company
    {
        if ($company->logo_path) {
            Storage::disk('public')->delete($company->logo_path);
        }

        $path = $file->store('company-logos', 'public');
        $company->update(['logo_path' => $path]);
        $updated = $company->fresh();

        $this->notifications->createNotification(
            userId: (int) $updated->owner_user_id,
            title: 'Company Logo Updated',
            message: "The logo for \"{$updated->name}\" has been updated.",
            data: [
                'type'       => 'company_logo_updated',
                'company_id' => $updated->id,
            ]
        );

        return $updated;
    }

    // -------------------------------------------------------------------------
    // Members
    // -------------------------------------------------------------------------

    public function listMembers(Company $company): \Illuminate\Database\Eloquent\Collection
    {
        return $company->members()->with('user')->get();
    }

    public function addMember(Company $company, array $data, User $invitedBy): CompanyMember
    {
        $member = DB::transaction(function () use ($company, $data, $invitedBy) {
            $user = User::create([
                'email'     => $data['email'],
                'phone'     => $data['phone'] ?? null,
                'password'  => Hash::make($data['password']),
                'role'      => 'company_member',
                'is_active' => true,
            ]);

            return CompanyMember::create([
                'user_id'         => $user->id,
                'company_id'      => $company->id,
                'first_name'      => $data['first_name'],
                'last_name'       => $data['last_name'],
                'role_in_company' => $data['role_in_company'] ?? 'member',
                'invited_by'      => $invitedBy->id,
            ]);
        });

        $this->cache->delPattern('admin:users:*');

        $this->notifications->createNotification(
            userId: (int) $member->user_id,
            title: "Welcome to {$company->name}",
            message: "You have been added as a member of {$company->name}.",
            data: [
                'type'       => 'member_added',
                'company_id' => $company->id,
                'member_id'  => $member->id,
            ]
        );

        return $member;
    }

    public function updateMember(CompanyMember $member, array $data): CompanyMember
    {
        $member->update(array_filter($data));
        $updated = $member->fresh();

        $this->notifications->createNotification(
            userId: (int) $updated->user_id,
            title: 'Your Company Profile Updated',
            message: 'Your company profile has been updated.',
            data: [
                'type'       => 'member_updated',
                'member_id'  => $updated->id,
                'company_id' => $updated->company_id,
            ]
        );

        return $updated;
    }

    public function removeMember(CompanyMember $member): void
    {
        $member->load('company');
        $ownerUserId = $member->company->owner_user_id;
        $memberName  = "{$member->first_name} {$member->last_name}";
        $companyName = $member->company->name;
        $companyId   = $member->company_id;

        DB::transaction(function () use ($member) {
            $user = $member->user;
            $member->delete();
            $user->tokens()->delete();
            $user->delete();
        });

        $this->cache->delPattern('admin:users:*');

        $this->notifications->createNotification(
            userId: (int) $ownerUserId,
            title: 'Team Member Removed',
            message: "{$memberName} has been removed from {$companyName}.",
            data: [
                'type'       => 'member_removed',
                'company_id' => $companyId,
            ]
        );
    }

    // -------------------------------------------------------------------------
    // Job Posts
    // -------------------------------------------------------------------------

    public function createJobPost(Company $company, User $creator, array $data): JobPost
    {
        $jobPost = DB::transaction(function () use ($company, $creator, $data) {
            $jobPost = $company->jobPosts()->create([
                ...$data,
                'created_by' => $creator->id,
                'status'     => $data['status'] ?? 'draft',
            ]);

            return $jobPost->load('company');
        });

        $this->notifications->createNotification(
            userId: (int) $creator->id,
            title: 'Job Post Created',
            message: "Your job post \"{$jobPost->title}\" has been created as {$jobPost->status}.",
            data: [
                'type'        => 'job_post_created',
                'company_id'  => $company->id,
                'job_post_id' => $jobPost->id,
                'status'      => $jobPost->status,
            ]
        );

        $this->cache->delPattern('public:job_posts:*');
        $this->cache->delPattern('company:job_posts:*');
        Log::debug('[REDIS] INVALIDATE company:job_posts:* public:job_posts:*');

        // Created directly as published → kick off the n8n embedding/matching
        // pipeline. The draft → published path is handled by the model's
        // "updated" event (see JobPost::booted()).
        if ($jobPost->status === 'published') {
            JobPostPublished::dispatch($jobPost);
        }

        return $jobPost;
    }

    public function updateJobPost(JobPost $jobPost, array $data): JobPost
    {
        $updated = DB::transaction(function () use ($jobPost, $data) {
            $jobPost->update(array_filter($data, fn ($v) => $v !== null));

            return $jobPost->fresh()->load('company');
        });

        $this->notifications->createNotification(
            userId: (int) $updated->company->owner_user_id,
            title: 'Job Post Updated',
            message: "The job post \"{$updated->title}\" has been updated.",
            data: [
                'type'        => 'job_post_updated',
                'company_id'  => $updated->company_id,
                'job_post_id' => $updated->id,
            ]
        );

        $this->cache->delPattern('public:job_posts:*');
        $this->cache->delPattern('company:job_posts:*');
        Log::debug('[REDIS] INVALIDATE company:job_posts:* public:job_posts:*');

        return $updated;
    }

    public function deleteJobPost(JobPost $jobPost): void
    {
        $jobPost->load('company');
        $ownerUserId = $jobPost->company->owner_user_id;
        $title       = $jobPost->title;
        $companyId   = $jobPost->company_id;
        $jobPostId   = $jobPost->id;

        $jobPost->delete();

        $this->notifications->createNotification(
            userId: (int) $ownerUserId,
            title: 'Job Post Deleted',
            message: "The job post \"{$title}\" has been deleted.",
            data: [
                'type'        => 'job_post_deleted',
                'company_id'  => $companyId,
                'job_post_id' => $jobPostId,
            ]
        );

        $this->cache->delPattern('public:job_posts:*');
        $this->cache->delPattern('company:job_posts:*');
        Log::debug('[REDIS] INVALIDATE company:job_posts:* public:job_posts:*');
    }

    public function listCompanyJobPosts(Company $company, array $filters): LengthAwarePaginator
    {
        $key = $this->cache->filterKey('company:job_posts', array_merge(
            ['company_id' => $company->id, 'page' => request()->input('page', 1)],
            $filters
        ));

        $cached = $this->cache->get($key);

        if ($cached !== null) {
            Log::debug('[REDIS] HIT company:job_posts');
            return new LengthAwarePaginator(
                JobPost::hydrate($cached['data']),
                $cached['total'],
                $cached['per_page'],
                $cached['current_page'],
            );
        }

        $query = $company->jobPosts()->withCount('applications');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $paginator = $query->latest()->paginate($filters['per_page'] ?? 15);

        // Use getAttributes() (raw DB values, casts NOT applied) so that on
        // hydration the array-cast columns (responsibilities, requirements) are
        // still strings — Laravel's cast can then decode them correctly.
        // Storing toArray() values (cast-applied PHP arrays) causes json_decode
        // to receive an array instead of a string and crash on the next request.
        $this->cache->set($key, [
            'data'         => collect($paginator->items())->map(fn ($m) => $m->getAttributes())->all(),
            'total'        => $paginator->total(),
            'per_page'     => $paginator->perPage(),
            'current_page' => $paginator->currentPage(),
        ], self::TTL_JOB_POSTS);

        Log::debug('[REDIS] MISS company:job_posts');

        return $paginator;
    }

    // -------------------------------------------------------------------------
    // Applicants
    // -------------------------------------------------------------------------

    public function listApplicants(JobPost $jobPost, array $filters): LengthAwarePaginator
    {
        $query = $jobPost->applications()
            ->with(['jobSeeker.skills', 'cv'])
            ->withCount([]);

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $allowedSorts = ['applied_at', 'status', 'score'];
        $sort = in_array($filters['sort'] ?? '', $allowedSorts) ? $filters['sort'] : 'applied_at';
        $dir  = ($filters['dir'] ?? '') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sort, $dir);

        return $query->paginate($filters['per_page'] ?? 20);
    }

    public function updateApplicationStatus(
        JobApplication $application,
        string $status,
        ?int $score = null
    ): JobApplication {
        $application->update(array_filter([
            'status' => $status,
            'score'  => $score,
        ], fn ($v) => $v !== null));

        $application->load('jobSeeker.user', 'jobPost');

        $this->notifications->createNotification(
            userId: (int) $application->jobSeeker->user_id,
            title: 'Application Status Updated',
            message: "Your application for \"{$application->jobPost->title}\" has been updated to: {$status}.",
            data: [
                'type'           => 'application_status_update',
                'application_id' => $application->id,
                'job_post_id'    => $application->job_post_id,
                'status'         => $status,
            ]
        );

        return $application->fresh();
    }
}
