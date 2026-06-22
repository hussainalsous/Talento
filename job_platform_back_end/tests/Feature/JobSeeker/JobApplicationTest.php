<?php

namespace Tests\Feature\JobSeeker;

use App\Models\JobApplication;
use App\Models\JobPost;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class JobApplicationTest extends TestCase
{
    // -------------------------------------------------------------------------
    // Apply
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_apply_to_published_job(): void
    {
        $seekerUser = $this->actingAsJobSeeker();
        $result     = $this->makeCompanyOwner();
        $jobPost    = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'status'     => 'published',
        ]);

        $response = $this->postJson("/api/v1/job-posts/{$jobPost->id}/apply", [
            'cover_letter' => 'I am very interested.',
        ]);

        $this->assertApiSuccess($response, 201);
        $this->assertDatabaseHas('job_applications', [
            'job_post_id'   => $jobPost->id,
            'job_seeker_id' => $seekerUser->jobSeeker->id,
            'status'        => 'submitted',
        ]);
    }

    public function test_job_seeker_cannot_apply_to_closed_job(): void
    {
        $seekerUser = $this->actingAsJobSeeker();
        $result     = $this->makeCompanyOwner();
        $jobPost    = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'status'     => 'closed',
        ]);

        $this->postJson("/api/v1/job-posts/{$jobPost->id}/apply")
             ->assertStatus(422);
    }

    public function test_job_seeker_cannot_apply_twice_to_same_job(): void
    {
        $seekerUser = $this->actingAsJobSeeker();
        $result     = $this->makeCompanyOwner();
        $jobPost    = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'status'     => 'published',
        ]);

        JobApplication::factory()->create([
            'job_post_id'   => $jobPost->id,
            'job_seeker_id' => $seekerUser->jobSeeker->id,
        ]);

        $this->postJson("/api/v1/job-posts/{$jobPost->id}/apply")
             ->assertStatus(409);
    }

    // -------------------------------------------------------------------------
    // List & Show
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_list_their_applications(): void
    {
        $seekerUser = $this->actingAsJobSeeker();
        $result     = $this->makeCompanyOwner();

        JobApplication::factory()->count(3)->create([
            'job_seeker_id' => $seekerUser->jobSeeker->id,
        ]);

        $response = $this->getJson('/api/v1/job-seeker/applications');

        $this->assertApiSuccess($response);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_job_seeker_cannot_view_another_seekers_application(): void
    {
        $seekerA = $this->actingAsJobSeeker();
        $seekerB = $this->makeJobSeeker();

        $result  = $this->makeCompanyOwner();
        $jobPost = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'status'     => 'published',
        ]);

        $application = JobApplication::factory()->create([
            'job_seeker_id' => $seekerB->jobSeeker->id,
            'job_post_id'   => $jobPost->id,
        ]);

        $this->getJson("/api/v1/job-seeker/applications/{$application->id}")
             ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Withdraw
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_withdraw_their_application(): void
    {
        $seekerUser  = $this->actingAsJobSeeker();
        $result      = $this->makeCompanyOwner();
        $jobPost     = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'status'     => 'published',
        ]);
        $application = JobApplication::factory()->create([
            'job_seeker_id' => $seekerUser->jobSeeker->id,
            'job_post_id'   => $jobPost->id,
            'status'        => 'submitted',
        ]);

        $response = $this->patchJson(
            "/api/v1/job-seeker/applications/{$application->id}/withdraw"
        );

        $this->assertApiSuccess($response);
        $this->assertDatabaseHas('job_applications', [
            'id'     => $application->id,
            'status' => 'withdrawn',
        ]);
    }

    // -------------------------------------------------------------------------
    // Company updates application status
    // -------------------------------------------------------------------------

    public function test_company_owner_can_shortlist_applicant(): void
    {
        ['user' => $user, 'company' => $company] = $this->actingAsCompanyOwner();

        $seekerUser  = $this->makeJobSeeker();
        $jobPost     = JobPost::factory()->create([
            'company_id' => $company->id,
            'created_by' => $user->id,
            'status'     => 'published',
        ]);
        $application = JobApplication::factory()->create([
            'job_post_id'   => $jobPost->id,
            'job_seeker_id' => $seekerUser->jobSeeker->id,
            'status'        => 'submitted',
        ]);

        $response = $this->patchJson(
            "/api/v1/company/applications/{$application->id}/status",
            ['status' => 'shortlisted', 'score' => 85]
        );

        $this->assertApiSuccess($response);
        $this->assertDatabaseHas('job_applications', [
            'id'     => $application->id,
            'status' => 'shortlisted',
            'score'  => 85,
        ]);
    }

    public function test_company_cannot_set_withdrawn_status(): void
    {
        ['user' => $user, 'company' => $company] = $this->actingAsCompanyOwner();

        $seekerUser  = $this->makeJobSeeker();
        $jobPost     = JobPost::factory()->create([
            'company_id' => $company->id,
            'created_by' => $user->id,
        ]);
        $application = JobApplication::factory()->create([
            'job_post_id'   => $jobPost->id,
            'job_seeker_id' => $seekerUser->jobSeeker->id,
        ]);

        $this->patchJson(
            "/api/v1/company/applications/{$application->id}/status",
            ['status' => 'withdrawn']  // not in COMPANY_ALLOWED_STATUSES
        )->assertStatus(422);
    }
}
