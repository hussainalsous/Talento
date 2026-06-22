<?php

namespace App\Services;

use App\Models\CV;
use App\Models\JobApplication;
use App\Models\JobPost;
use App\Models\JobSeeker;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Services\RedisCacheService;

class JobSeekerService
{
    public function __construct(
        private readonly SupabaseNotificationService $notifications,
        private readonly RedisCacheService $cache,
    ) {}

    // -------------------------------------------------------------------------
    // Profile
    // -------------------------------------------------------------------------

    public function getProfileForUser(User $user): JobSeeker
    {
        return $user->jobSeeker ?? abort(404, 'Job seeker profile not found.');
    }

    public function updateProfile(JobSeeker $jobSeeker, array $data): JobSeeker
    {
        if (isset($data['phone'])) {
            $jobSeeker->user->update(['phone' => $data['phone']]);
            unset($data['phone']);
        }

        $jobSeeker->update(array_filter($data, fn ($v) => $v !== null));
        $jobSeeker->update(['last_updated_at' => now()]);

        $updated = $jobSeeker->fresh();

        $this->notifications->createNotification(
            userId: (int) $jobSeeker->user_id,
            title: 'Profile Updated',
            message: 'Your job seeker profile has been updated.',
            data: [
                'type'          => 'profile_updated',
                'job_seeker_id' => $jobSeeker->id,
            ]
        );

        return $updated;
    }

    public function updatePrivacy(JobSeeker $jobSeeker, array $data): JobSeeker
    {
        $payload = [];

        if (array_key_exists('profile_visibility', $data)) {
            $payload['profile_visibility'] = $data['profile_visibility'];
        }

        if (array_key_exists('cv_visibility', $data)) {
            $payload['cv_visibility'] = $data['cv_visibility'];
        }

        if (array_key_exists('open_to_work', $data)) {
            $payload['open_to_work'] = $data['open_to_work'];
        }

        if (! empty($payload)) {
            $payload['last_updated_at'] = now();
            $jobSeeker->update($payload);
        }

        $updated = $jobSeeker->fresh();

        $this->notifications->createNotification(
            userId: (int) $jobSeeker->user_id,
            title: 'Privacy Settings Updated',
            message: 'Your privacy settings have been updated.',
            data: [
                'type'          => 'privacy_updated',
                'job_seeker_id' => $jobSeeker->id,
            ]
        );

        return $updated;
    }

    // -------------------------------------------------------------------------
    // CVs
    // -------------------------------------------------------------------------

    public function listCvs(JobSeeker $jobSeeker): \Illuminate\Database\Eloquent\Collection
    {
        return $jobSeeker->cvs()->latest()->get();
    }

    public function uploadCv(JobSeeker $jobSeeker, array $data, $file = null): CV
    {
        $cv = DB::transaction(function () use ($jobSeeker, $data, $file) {
            $filePath = null;
            if ($file) {
                $filePath = $file->store("cvs/{$jobSeeker->id}", 'public');
            }

            if (! empty($data['is_primary'])) {
                $jobSeeker->cvs()->where('is_primary', true)->update(['is_primary' => false]);
            }

            return CV::create([
                'job_seeker_id' => $jobSeeker->id,
                'title'         => $data['title'],
                'file_path'     => $filePath,
                'visibility'    => $data['visibility'] ?? $jobSeeker->cv_visibility,
                'is_primary'    => $data['is_primary'] ?? ($jobSeeker->cvs()->count() === 0),
            ]);
        });

        $this->notifications->createNotification(
            userId: (int) $jobSeeker->user_id,
            title: 'CV Uploaded',
            message: "Your CV \"{$cv->title}\" has been uploaded successfully.",
            data: [
                'type'          => 'cv_uploaded',
                'cv_id'         => $cv->id,
                'job_seeker_id' => $jobSeeker->id,
            ]
        );

        return $cv;
    }

    public function updateCv(CV $cv, array $data, $file = null): CV
    {
        $updated = DB::transaction(function () use ($cv, $data, $file) {
            if ($file) {
                if ($cv->file_path) {
                    Storage::disk('public')->delete($cv->file_path);
                }
                $data['file_path'] = $file->store("cvs/{$cv->job_seeker_id}", 'public');
            }

            if (! empty($data['is_primary'])) {
                $cv->jobSeeker->cvs()->where('id', '!=', $cv->id)->update(['is_primary' => false]);
            }

            $cv->update(array_filter($data, fn ($v) => $v !== null));
            return $cv->fresh()->load('jobSeeker');
        });

        $this->notifications->createNotification(
            userId: (int) $updated->jobSeeker->user_id,
            title: 'CV Updated',
            message: "Your CV \"{$updated->title}\" has been updated.",
            data: [
                'type'  => 'cv_updated',
                'cv_id' => $updated->id,
            ]
        );

        return $updated;
    }

    public function deleteCv(CV $cv): void
    {
        $jobSeekerUserId = $cv->jobSeeker->user_id;
        $cvTitle         = $cv->title ?? 'CV';
        $cvId            = $cv->id;

        if ($cv->file_path) {
            Storage::disk('public')->delete($cv->file_path);
        }
        $cv->delete();

        $this->notifications->createNotification(
            userId: (int) $jobSeekerUserId,
            title: 'CV Deleted',
            message: "Your CV \"{$cvTitle}\" has been deleted.",
            data: [
                'type'  => 'cv_deleted',
                'cv_id' => $cvId,
            ]
        );
    }

    // -------------------------------------------------------------------------
    // Applications
    // -------------------------------------------------------------------------

    public function applyToJob(
        JobSeeker $jobSeeker,
        JobPost $jobPost,
        array $data
    ): JobApplication {
        if ($jobPost->applications()->where('job_seeker_id', $jobSeeker->id)->exists()) {
            abort(409, 'You have already applied to this job.');
        }

        abort_unless($jobPost->status === 'published', 422, 'This job is not accepting applications.');

        $application = JobApplication::create([
            'job_post_id'   => $jobPost->id,
            'job_seeker_id' => $jobSeeker->id,
            'cv_id'         => $data['cv_id'] ?? $jobSeeker->primaryCv?->id,
            'cover_letter'  => $data['cover_letter'] ?? null,
            'status'        => 'submitted',
            'applied_at'    => now(),
        ]);

        $jobPost->load('company.members');
        foreach ($jobPost->company->members as $member) {
            $this->notifications->createNotification(
                userId: (int) $member->user_id,
                title: 'New Application Received',
                message: "{$jobSeeker->first_name} {$jobSeeker->last_name} applied for \"{$jobPost->title}\".",
                data: [
                    'type'           => 'new_application',
                    'application_id' => $application->id,
                    'job_post_id'    => $jobPost->id,
                    'job_seeker_id'  => $jobSeeker->id,
                    'company_id'     => $jobPost->company_id,
                ]
            );
        }

        return $application;
    }

    public function listApplications(JobSeeker $jobSeeker, array $filters): LengthAwarePaginator
    {
        $query = $jobSeeker->jobApplications()->with(['jobPost.company', 'cv']);

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->latest('applied_at')->paginate($filters['per_page'] ?? 15);
    }

    public function withdrawApplication(JobApplication $application): JobApplication
    {
        abort_if(
            $application->status === 'withdrawn',
            409,
            'Application is already withdrawn.'
        );

        $application->update(['status' => 'withdrawn']);
        $updated = $application->fresh()->load('jobSeeker.user', 'jobPost.company.members');

        $this->notifications->createNotification(
            userId: (int) $updated->jobSeeker->user_id,
            title: 'Application Withdrawn',
            message: "Your application for \"{$updated->jobPost->title}\" has been withdrawn.",
            data: [
                'type'           => 'application_withdrawn',
                'application_id' => $updated->id,
                'job_post_id'    => $updated->job_post_id,
            ]
        );

        foreach ($updated->jobPost->company->members as $member) {
            $this->notifications->createNotification(
                userId: (int) $member->user_id,
                title: 'Application Withdrawn',
                message: "{$updated->jobSeeker->first_name} {$updated->jobSeeker->last_name} withdrew their application for \"{$updated->jobPost->title}\".",
                data: [
                    'type'           => 'application_withdrawn_company',
                    'application_id' => $updated->id,
                    'job_post_id'    => $updated->job_post_id,
                    'job_seeker_id'  => $updated->job_seeker_id,
                    'company_id'     => $updated->jobPost->company_id,
                ]
            );
        }

        return $updated;
    }

}
