<?php

namespace App\Policies;

use App\Models\CV;
use App\Models\User;

class CvPolicy
{
    /**
     * The CV owner or admin can always view a CV.
     * Companies can view if visibility = public.
     * Companies cannot view if visibility = private or upon_request.
     */
    public function view(User $user, CV $cv): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->jobSeeker?->id === $cv->job_seeker_id) {
            return true;
        }

        if ($user->isCompanyMember()) {
            return $cv->visibility === 'public';
        }

        return false;
    }

    public function update(User $user, CV $cv): bool
    {
        return $user->isAdmin() || $user->jobSeeker?->id === $cv->job_seeker_id;
    }

    public function delete(User $user, CV $cv): bool
    {
        // Admin can delete inappropriate CVs; owner can delete their own
        return $user->isAdmin() || $user->jobSeeker?->id === $cv->job_seeker_id;
    }

    public function analyze(User $user, CV $cv): bool
    {
        return $user->jobSeeker?->id === $cv->job_seeker_id;
    }
}
