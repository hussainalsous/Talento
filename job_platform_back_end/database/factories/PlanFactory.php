<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class PlanFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'          => fake()->unique()->word() . ' Plan',
            'description'   => fake()->sentence(),
            'price'         => fake()->randomElement([99, 199, 499, 999]),
            'billing_cycle' => fake()->randomElement(['monthly', 'quarterly', 'annual', 'free']),
            'max_job_posts' => fake()->randomElement([5, 10, 25, 100]),
            'max_members'   => fake()->randomElement([3, 5, 10, 50]),
            'is_active'     => true,
        ];
    }
}
