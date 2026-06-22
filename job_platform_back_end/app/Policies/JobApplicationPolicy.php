<?php

namespace App\Policies;

use App\Models\JobApplication;
use App\Models\User;

class JobApplicationPolicy
{
    /**
     * The job seeker who owns the application, or admin.
     */
    public function view(User $user, JobApplication $application): bool
    {
        if ($user->isAdmin()) {
            return true;
        }
        if ($user->isJobSeeker()) {
            return $user->jobSeeker?->id === $application->job_seeker_id;
        }
        // Company staff can view applications on their job posts
        return $user->companyMember?->company_id === $application->jobPost->company_id;
    }

    /**
     * Only the job seeker who applied can withdraw.
     */
    public function withdraw(User $user, JobApplication $application): bool
    {
        return $user->jobSeeker?->id === $application->job_seeker_id
            && $application->status !== 'withdrawn';
    }

    /**
     * Company staff on the owning company can update status.
     */
    public function updateStatus(User $user, JobApplication $application): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->isCompanyMember()
            && $user->companyMember?->company_id === $application->jobPost->company_id;
    }
}
