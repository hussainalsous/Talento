<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\JobSeeker;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class InvitationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id'    => Company::factory(),
            'invited_by'    => User::factory()->companyOwner(),
            'job_seeker_id' => JobSeeker::factory(),
            'job_post_id'   => null,
            'message'       => fake()->sentence(),
            'status'        => 'pending',
            'sent_at'       => now(),
            'responded_at'  => null,
        ];
    }
}
