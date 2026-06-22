<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Invitation;
use App\Models\JobPost;
use App\Models\JobSeeker;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;

class InvitationService
{
    public function __construct(private readonly SupabaseNotificationService $notifications) {}

    public function sendInvitation(Company $company, User $sender, array $data): Invitation
    {
        $jobPostId = $data['job_post_id'] ?? null;

        if ($jobPostId) {
            $belongs = JobPost::where('id', $jobPostId)
                              ->where('company_id', $company->id)
                              ->exists();

            if (! $belongs) {
                throw ValidationException::withMessages([
                    'job_post_id' => 'The selected job post does not belong to your company.',
                ]);
            }
        }

        $duplicate = Invitation::where('company_id', $company->id)
                               ->where('job_seeker_id', $data['job_seeker_id'])
                               ->when($jobPostId, fn ($q) => $q->where('job_post_id', $jobPostId))
                               ->whereIn('status', ['pending', 'accepted'])
                               ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages([
                'job_seeker_id' => 'An active invitation already exists for this candidate.',
            ]);
        }

        $invitation = Invitation::create([
            'company_id'    => $company->id,
            'invited_by'    => $sender->id,
            'job_seeker_id' => $data['job_seeker_id'],
            'job_post_id'   => $jobPostId,
            'message'       => $data['message'] ?? null,
            'status'        => 'pending',
            'sent_at'       => now(),
        ]);

        $invitation->load('jobSeeker.user');

        $this->notifications->createNotification(
            userId: (int) $invitation->jobSeeker->user_id,
            title: 'You Have a New Invitation',
            message: "{$company->name} has invited you to apply for a position.",
            data: [
                'type'          => 'invitation_received',
                'invitation_id' => $invitation->id,
                'company_id'    => $company->id,
                'job_post_id'   => $jobPostId,
            ]
        );

        return $invitation;
    }

    public function respondToInvitation(Invitation $invitation, string $status): Invitation
    {
        if ($invitation->status !== 'pending') {
            throw ValidationException::withMessages([
                'invitation' => 'This invitation has already been responded to.',
            ]);
        }

        $invitation->update([
            'status'       => $status,
            'responded_at' => now(),
        ]);

        $updated = $invitation->fresh()->load('jobSeeker');

        $jobSeekerName = "{$updated->jobSeeker->first_name} {$updated->jobSeeker->last_name}";

        $this->notifications->createNotification(
            userId: (int) $updated->invited_by,
            title: 'Invitation ' . ucfirst($status),
            message: "{$jobSeekerName} has {$status} your invitation.",
            data: [
                'type'          => 'invitation_responded',
                'invitation_id' => $updated->id,
                'status'        => $status,
                'job_seeker_id' => $updated->job_seeker_id,
            ]
        );

        return $updated;
    }

    public function listForJobSeeker(JobSeeker $jobSeeker, array $filters): LengthAwarePaginator
    {
        $query = $jobSeeker->invitations()->with(['company', 'jobPost', 'invitedBy']);

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->latest('sent_at')->paginate($filters['per_page'] ?? 15);
    }

    public function listForCompany(Company $company, array $filters): LengthAwarePaginator
    {
        $query = $company->invitations()->with(['jobSeeker.user', 'jobPost']);

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->latest('sent_at')->paginate($filters['per_page'] ?? 15);
    }
}
