<?php

namespace App\Policies;

use App\Models\Invitation;
use App\Models\User;

class InvitationPolicy
{
    /**
     * Job seeker can respond to invitations addressed to them.
     * Whether the invitation is still pending is enforced at the service layer (422).
     */
    public function respond(User $user, Invitation $invitation): bool
    {
        return $user->jobSeeker?->id === $invitation->job_seeker_id;
    }

    /**
     * Company staff can view invitations sent by their company.
     */
    public function view(User $user, Invitation $invitation): bool
    {
        if ($user->isAdmin()) {
            return true;
        }
        if ($user->isJobSeeker()) {
            return $user->jobSeeker?->id === $invitation->job_seeker_id;
        }
        return $user->companyMember?->company_id === $invitation->company_id;
    }
}
