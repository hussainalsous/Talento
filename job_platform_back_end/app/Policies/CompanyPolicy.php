<?php

namespace App\Policies;

use App\Models\Company;
use App\Models\User;

class CompanyPolicy
{
    /**
     * Only the company owner or an admin can view full company details.
     */
    public function view(User $user, Company $company): bool
    {
        return $user->isAdmin()
            || $user->id === $company->owner_user_id
            || $this->isMemberOf($user, $company);
    }

    /**
     * Only the company owner or admin can update company profile.
     */
    public function update(User $user, Company $company): bool
    {
        return $user->isAdmin() || $user->id === $company->owner_user_id;
    }

    /**
     * Only admin can approve/reject companies.
     */
    public function approve(User $user): bool
    {
        return $user->isAdmin();
    }

    /**
     * Only company owner or admin can manage members.
     */
    public function manageMembers(User $user, Company $company): bool
    {
        return $user->isAdmin() || $user->id === $company->owner_user_id;
    }

    /**
     * Both owner and company members can post jobs.
     */
    public function createJobPost(User $user, Company $company): bool
    {
        return $user->isAdmin()
            || $user->id === $company->owner_user_id
            || $this->isMemberOf($user, $company);
    }

    private function isMemberOf(User $user, Company $company): bool
    {
        return $company->members()->where('user_id', $user->id)->exists();
    }
}
