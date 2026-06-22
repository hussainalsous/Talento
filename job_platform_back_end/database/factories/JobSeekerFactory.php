<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class JobSeekerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'            => User::factory()->jobSeeker(),
            'first_name'         => fake()->firstName(),
            'last_name'          => fake()->lastName(),
            'current_job'        => fake()->optional()->jobTitle(),
            'location'           => fake()->optional()->city(),
            'preferred_job_type' => fake()->optional()->randomElement([
                'full_time', 'part_time', 'remote', 'contract',
            ]),
            'desired_salary'     => fake()->optional()->numberBetween(30000, 150000),
            'profile_visibility' => 'public',
            'cv_visibility'      => 'public',
            'last_updated_at'    => now(),
        ];
    }

    public function private(): static
    {
        return $this->state([
            'profile_visibility' => 'private',
            'cv_visibility'      => 'private',
        ]);
    }

    public function cvUponRequest(): static
    {
        return $this->state(['cv_visibility' => 'upon_request']);
    }
}
