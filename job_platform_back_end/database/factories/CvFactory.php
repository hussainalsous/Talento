<?php

namespace Database\Factories;

use App\Models\JobSeeker;
use Illuminate\Database\Eloquent\Factories\Factory;

class CvFactory extends Factory
{
    public function definition(): array
    {
        return [
            'job_seeker_id' => JobSeeker::factory(),
            'title'         => fake()->jobTitle() . ' CV',
            'file_path'     => null,
            'parsed_data'   => null,
            'is_primary'    => false,
            'visibility'    => 'public',
        ];
    }

    public function primary(): static
    {
        return $this->state(['is_primary' => true]);
    }

    public function private(): static
    {
        return $this->state(['visibility' => 'private']);
    }
}
