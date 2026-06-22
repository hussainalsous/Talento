<?php

namespace App\Services;

use App\Models\Course;
use Illuminate\Database\Eloquent\Collection;

class CourseRecommendationService
{
    public function recommend(int $limit = 10): Collection
    {
        return Course::latest()->limit($limit)->get();
    }
}
