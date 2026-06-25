<?php

namespace App\Services;

use App\Models\CV;
use App\Models\JobApplication;
use App\Models\JobPost;
use App\Models\JobSeeker;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Services\RedisCacheService;

class JobSeekerService
{
    public function __construct(
        private readonly SupabaseNotificationService $notifications,
        private readonly RedisCacheService $cache,
        private readonly GoogleDriveService $googleDrive,
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
    // CV — Google Drive upload, registration & n8n trigger
    // -------------------------------------------------------------------------

    /**
     * Flutter uploads directly to Drive and sends us the file ID.
     * Persists the mapping and triggers the cv-match webhook (legacy flow).
     */
    public function registerCv(User $user, array $data): void
    {
        $jobSeeker = $this->getProfileForUser($user);
        $cv        = $this->persistDriveCv($user, $jobSeeker, $data['google_drive_file_id'], $data['file_name']);

        $this->fireN8nWebhook(
            webhookKey: 'cv_match_webhook',
            logTag:     'registerCv',
            payload:    [
                'candidate_id' => $data['google_drive_file_id'],
                'trigger'      => 'cv_upload',
                'callback'     => $this->n8nCallbacks(['match_done', 'log_error']),
            ],
        );
    }

    /**
     * Laravel receives the PDF, uploads it to Google Drive, then triggers the
     * cv-ingest webhook so n8n can OCR + embed + match without polling Drive.
     *
     * @return array{ google_drive_file_id: string, cv_id: int }
     */
    public function uploadCvToDrive(User $user, UploadedFile $file, ?string $title): array
    {
        $jobSeeker = $this->getProfileForUser($user);
        $filename  = $title
            ? "{$title}.pdf"
            : "cv_{$jobSeeker->id}_" . now()->format('YmdHis') . '.pdf';

        $driveFileId = $this->googleDrive->uploadPdf($file, $filename);

        $cv = $this->persistDriveCv($user, $jobSeeker, $driveFileId, $title ?? $filename);

        $this->fireN8nWebhook(
            webhookKey: 'cv_ingest_webhook',
            logTag:     'uploadCvToDrive',
            payload:    [
                'drive_file_id' => $driveFileId,
                'candidate_id'  => $driveFileId,
                'trigger'       => 'cv_upload',
                'callback'      => $this->n8nCallbacks(['match_done', 'log_error']),
            ],
        );

        return [
            'google_drive_file_id' => $driveFileId,
            'cv_id'                => $cv->id,
        ];
    }

    /**
     * Persist the Google Drive file ID on the user and create/replace the
     * primary CV record. Shared by registerCv() and uploadCvToDrive().
     */
    private function persistDriveCv(User $user, JobSeeker $jobSeeker, string $driveFileId, string $title): CV
    {
        return DB::transaction(function () use ($user, $jobSeeker, $driveFileId, $title) {
            $user->update(['google_drive_file_id' => $driveFileId]);

            $jobSeeker->cvs()->where('is_primary', true)->update(['is_primary' => false]);

            return CV::create([
                'job_seeker_id' => $jobSeeker->id,
                'title'         => $title,
                'file_path'     => null,
                'is_primary'    => true,
                'visibility'    => $jobSeeker->cv_visibility,
            ]);
        });
    }

    /**
     * Build the standard callback URLs n8n calls back into.
     * Keys: 'match_done', 'log_error', 'embedding_done'
     *
     * @param  list<string>  $keys
     */
    private function n8nCallbacks(array $keys): array
    {
        $paths = [
            'match_done'     => '/api/n8n/match/done',
            'log_error'      => '/api/n8n/log-error',
            'embedding_done' => '/api/n8n/job-embedding/done',
        ];

        $base = config('services.n8n.callback_base');

        return array_reduce($keys, function (array $carry, string $key) use ($base, $paths) {
            $carry[$key] = $base . $paths[$key];
            return $carry;
        }, []);
    }

    /**
     * POST to an n8n webhook. Logs failures but never throws — the primary
     * response (CV saved) must not be blocked by n8n availability.
     */
    private function fireN8nWebhook(string $webhookKey, string $logTag, array $payload): void
    {
        $url = config("services.n8n.{$webhookKey}");

        try {
            $response = Http::timeout(10)
                ->withHeaders(['X-N8N-Webhook-Secret' => config('services.n8n.webhook_secret')])
                ->post($url, $payload);

            Log::info("[{$logTag}] n8n webhook fired", [
                'url'    => $url,
                'status' => $response->status(),
            ]);
        } catch (\Throwable $e) {
            Log::error("[{$logTag}] failed to reach n8n webhook", [
                'url'       => $url,
                'exception' => $e->getMessage(),
            ]);
        }
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
