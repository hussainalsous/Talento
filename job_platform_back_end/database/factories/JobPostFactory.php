<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class JobPostFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id'      => Company::factory(),
            'created_by'      => User::factory()->companyOwner(),
            'job_title_id'    => null,
            'title'           => fake()->jobTitle(),
            'description'     => fake()->paragraphs(3, true),
            'location'        => fake()->city(),
            'employment_type' => fake()->randomElement(['full_time', 'part_time', 'remote', 'contract']),
            'salary_min'      => fake()->optional()->numberBetween(30000, 80000),
            'salary_max'      => fake()->optional()->numberBetween(80001, 200000),
            'responsibilities' => fake()->paragraph(),
            'requirements'    => fake()->paragraph(),
            'status'          => 'published',
            'expires_at'      => now()->addMonths(2),
        ];
    }

    public function draft(): static
    {
        return $this->state(['status' => 'draft']);
    }

    public function published(): static
    {
        return $this->state(['status' => 'published']);
    }

    public function closed(): static
    {
        return $this->state(['status' => 'closed']);
    }
}
