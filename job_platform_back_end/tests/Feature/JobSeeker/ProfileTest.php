<?php

namespace Tests\Feature\JobSeeker;

use Tests\TestCase;

class ProfileTest extends TestCase
{
    // -------------------------------------------------------------------------
    // View profile
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_view_own_profile(): void
    {
        $seeker = $this->actingAsJobSeeker();

        $response = $this->getJson('/api/v1/job-seeker/profile');

        $this->assertApiSuccess($response);
        $response->assertJsonPath('data.user_id', $seeker->jobSeeker->user_id);
    }

    // -------------------------------------------------------------------------
    // Update profile
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_update_profile(): void
    {
        $this->actingAsJobSeeker();

        $response = $this->patchJson('/api/v1/job-seeker/profile', [
            'first_name'        => 'UpdatedFirst',
            'last_name'         => 'UpdatedLast',
            'location'          => 'Riyadh',
            'current_job'       => 'Senior Developer',
            'preferred_job_type'=> 'full_time',
            'desired_salary'    => 15000,
        ]);

        $this->assertApiSuccess($response);
        $this->assertEquals('UpdatedFirst', $response->json('data.first_name'));
        $this->assertEquals('Riyadh', $response->json('data.location'));
    }

    public function test_profile_update_validates_employment_type(): void
    {
        $this->actingAsJobSeeker();

        $this->patchJson('/api/v1/job-seeker/profile', [
            'preferred_job_type' => 'invalid_type',
        ])->assertStatus(422);
    }

    // -------------------------------------------------------------------------
    // Privacy settings
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_update_privacy_settings(): void
    {
        $seeker = $this->actingAsJobSeeker();

        $response = $this->patchJson('/api/v1/job-seeker/privacy', [
            'profile_visibility' => 'limited',
            'cv_visibility'      => 'upon_request',
        ]);

        $this->assertApiSuccess($response);
        $this->assertDatabaseHas('job_seekers', [
            'id'                 => $seeker->jobSeeker->id,
            'profile_visibility' => 'limited',
            'cv_visibility'      => 'upon_request',
        ]);
    }

    public function test_privacy_update_rejects_invalid_visibility(): void
    {
        $this->actingAsJobSeeker();

        $this->patchJson('/api/v1/job-seeker/privacy', [
            'profile_visibility' => 'invisible', // invalid
        ])->assertStatus(422);
    }

}
