<?php

namespace App\Services;

use App\Models\JobSeeker;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

class CandidateSearchService
{
    /**
     * Search the candidate database respecting privacy settings.
     * Companies only see seekers whose profile_visibility is not 'private'.
     */
    public function search(array $filters, User $viewer): LengthAwarePaginator
    {
        $isAdmin = $viewer->isAdmin();

        $query = JobSeeker::with(['user'])
            ->whereHas('user', fn ($q) => $q->where('is_active', true));

        // Privacy filter — admins bypass
        if (! $isAdmin) {
            $query->whereIn('profile_visibility', ['public', 'limited']);
        }

        // Keyword search on name or location
        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function ($q) use ($term) {
                $q->where('first_name', 'like', "%{$term}%")
                  ->orWhere('last_name', 'like', "%{$term}%")
                  ->orWhere('current_job', 'like', "%{$term}%")
                  ->orWhere('location', 'like', "%{$term}%");
            });
        }

        if (! empty($filters['location'])) {
            $query->where('location', 'like', "%{$filters['location']}%");
        }

        if (! empty($filters['preferred_job_type'])) {
            $query->where('preferred_job_type', $filters['preferred_job_type']);
        }

        if (! empty($filters['salary_max'])) {
            $query->where(function ($q) use ($filters) {
                $q->whereNull('desired_salary')
                  ->orWhere('desired_salary', '<=', $filters['salary_max']);
            });
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 50);

        return $query->paginate($perPage);
    }

    /**
     * Get a single candidate's profile, respecting privacy.
     * Returns null-safe — the caller must handle 403 if needed.
     */
    public function getCandidate(JobSeeker $jobSeeker, User $viewer): ?JobSeeker
    {
        if (! $jobSeeker->isProfileVisibleTo($viewer)) {
            return null;
        }

        $jobSeeker->load(['user']);

        // Load CV only if directly accessible
        if ($jobSeeker->isCvDirectlyAccessibleTo($viewer)) {
            $jobSeeker->load('primaryCv');
        }

        return $jobSeeker;
    }
}
