<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

class CompanyRegistrationRequestFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_name'         => fake()->company(),
            'registration_number'  => fake()->unique()->numerify('REG-######'),
            'website'              => fake()->optional()->url(),
            'address'              => fake()->optional()->address(),
            'country'              => fake()->optional()->country(),
            'description'          => fake()->optional()->paragraph(),
            'logo_path'            => null,
            'requester_first_name' => fake()->firstName(),
            'requester_last_name'  => fake()->lastName(),
            'requester_email'      => fake()->unique()->safeEmail(),
            'requester_phone'      => fake()->optional()->phoneNumber(),
            'password'             => Hash::make('password'),
            'status'               => 'pending',
            'email_verified_at'    => null,
            'reviewed_by'          => null,
            'reviewed_at'          => null,
            'rejection_reason'     => null,
            'company_id'           => null,
        ];
    }

    public function emailVerified(): static
    {
        return $this->state(['email_verified_at' => now()]);
    }
}
