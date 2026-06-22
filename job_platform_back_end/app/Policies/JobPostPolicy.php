<?php

namespace App\Policies;

use App\Models\JobPost;
use App\Models\User;

class JobPostPolicy
{
    /**
     * Company member who belongs to the same company, or admin.
     */
    public function view(User $user, JobPost $jobPost): bool
    {
        return $user->isAdmin() || $this->isCompanyStaff($user, $jobPost);
    }

    public function update(User $user, JobPost $jobPost): bool
    {
        return $user->isAdmin() || $this->isCompanyStaff($user, $jobPost);
    }

    public function delete(User $user, JobPost $jobPost): bool
    {
        return $user->isAdmin() || $this->isCompanyStaff($user, $jobPost);
    }

    public function viewApplicants(User $user, JobPost $jobPost): bool
    {
        return $user->isAdmin() || $this->isCompanyStaff($user, $jobPost);
    }

    private function isCompanyStaff(User $user, JobPost $jobPost): bool
    {
        return $user->companyMember && $user->companyMember->company_id === $jobPost->company_id;
    }
}
