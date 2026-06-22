<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Only admin can manage other users.
     */
    public function manage(User $currentUser, User $targetUser): bool
    {
        return $currentUser->isAdmin();
    }

    /**
     * Users can view their own profile; admin can view any.
     */
    public function view(User $currentUser, User $targetUser): bool
    {
        return $currentUser->isAdmin() || $currentUser->id === $targetUser->id;
    }
}
