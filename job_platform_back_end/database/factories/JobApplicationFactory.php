<?php

namespace Database\Factories;

use App\Models\JobPost;
use App\Models\JobSeeker;
use Illuminate\Database\Eloquent\Factories\Factory;

class JobApplicationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'job_post_id'   => JobPost::factory()->published(),
            'job_seeker_id' => JobSeeker::factory(),
            'cv_id'         => null,
            'cover_letter'  => fake()->optional()->paragraph(),
            'status'        => 'submitted',
            'score'         => null,
            'applied_at'    => now(),
        ];
    }
}
