<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'email'             => fake()->unique()->safeEmail(),
            'phone'             => fake()->optional()->phoneNumber(),
            'password'          => static::$password ??= Hash::make('password'),
            'role'              => 'job_seeker',
            'is_active'         => true,
            'email_verified_at' => null,
            'remember_token'    => Str::random(10),
        ];
    }

    public function verified(): static
    {
        return $this->state(['email_verified_at' => now()]);
    }

    public function unverified(): static
    {
        return $this->state(['email_verified_at' => null]);
    }

    public function admin(): static
    {
        return $this->state(['role' => 'admin']);
    }

    public function companyOwner(): static
    {
        return $this->state(['role' => 'company_owner']);
    }

    public function companyMember(): static
    {
        return $this->state(['role' => 'company_member']);
    }

    public function jobSeeker(): static
    {
        return $this->state(['role' => 'job_seeker']);
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
