<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AdminFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'     => User::factory()->admin(),
            'first_name'  => fake()->firstName(),
            'last_name'   => fake()->lastName(),
            'permissions' => ['manage_users', 'manage_company_requests'],
        ];
    }

    public function superAdmin(): static
    {
        return $this->state(['permissions' => ['*']]);
    }
}
