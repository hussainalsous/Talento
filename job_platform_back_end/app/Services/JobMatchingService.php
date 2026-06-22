<?php

namespace App\Services;

use App\Models\JobPost;
use App\Models\JobSeeker;
use Illuminate\Pagination\LengthAwarePaginator;

class JobMatchingService
{
    public function suitableJobs(JobSeeker $jobSeeker, array $filters = []): LengthAwarePaginator
    {
        $query = JobPost::published()->with(['company']);

        if ($jobSeeker->preferred_job_type) {
            $query->orderByRaw(
                "CASE WHEN employment_type = ? THEN 0 ELSE 1 END",
                [$jobSeeker->preferred_job_type]
            );
        }

        if ($jobSeeker->location) {
            $query->orderByRaw(
                "CASE WHEN location LIKE ? THEN 0 ELSE 1 END",
                ["%{$jobSeeker->location}%"]
            );
        }

        if ($jobSeeker->desired_salary) {
            $maxAcceptable = $jobSeeker->desired_salary * 1.2;
            $query->where(function ($q) use ($maxAcceptable) {
                $q->whereNull('salary_min')
                  ->orWhere('salary_min', '<=', $maxAcceptable);
            });
        }

        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(fn ($q) => $q
                ->where('title', 'like', "%{$term}%")
                ->orWhere('description', 'like', "%{$term}%")
            );
        }

        if (! empty($filters['location'])) {
            $query->where('location', 'like', "%{$filters['location']}%");
        }

        if (! empty($filters['employment_type'])) {
            $query->where('employment_type', $filters['employment_type']);
        }

        $query->orderByDesc('created_at');

        $perPage = min((int) ($filters['per_page'] ?? 15), 50);

        return $query->paginate($perPage);
    }
}
