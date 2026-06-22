<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class CourseFactory extends Factory
{
    public function definition(): array
    {
        $providers = ['Udemy', 'Coursera', 'Pluralsight', 'LinkedIn Learning', 'edX'];

        $categories = ['Technology', 'Business', 'Design', 'Marketing', 'Data Science'];

        return [
            'title'       => fake()->words(4, true) . ' Masterclass',
            'provider'    => fake()->randomElement($providers),
            'link'        => fake()->url(),
            'description' => fake()->sentence(12),
            'category'    => fake()->randomElement($categories),
        ];
    }
}
