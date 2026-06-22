<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CompanyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'owner_user_id'       => null,
            'name'                => fake()->company(),
            'registration_number' => fake()->unique()->numerify('REG-######'),
            'website'             => fake()->optional()->url(),
            'address'             => fake()->optional()->address(),
            'country'             => fake()->optional()->country(),
            'description'         => fake()->optional()->paragraph(),
            'logo_path'           => null,
            'approval_status'     => 'approved',
            'approved_by'         => null,
            'approved_at'         => now(),
        ];
    }

    public function pending(): static
    {
        return $this->state([
            'approval_status' => 'pending',
            'approved_by'     => null,
            'approved_at'     => null,
        ]);
    }
}
