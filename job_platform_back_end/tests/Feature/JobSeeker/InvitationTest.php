<?php

namespace Tests\Feature\JobSeeker;

use App\Models\Invitation;
use App\Models\JobPost;
use Tests\TestCase;

class InvitationTest extends TestCase
{
    // -------------------------------------------------------------------------
    // List received invitations
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_list_received_invitations(): void
    {
        $seeker = $this->actingAsJobSeeker();
        $result = $this->makeCompanyOwner();

        $jobPost = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
        ]);

        Invitation::factory()->count(2)->create([
            'job_seeker_id' => $seeker->jobSeeker->id,
            'company_id'    => $result['company']->id,
            'job_post_id'   => $jobPost->id,
            'status'        => 'pending',
        ]);

        $response = $this->getJson('/api/v1/job-seeker/invitations');

        $this->assertApiSuccess($response);
        $this->assertCount(2, $response->json('data'));
    }

    public function test_job_seeker_cannot_see_another_seekers_invitations(): void
    {
        $seekerA = $this->actingAsJobSeeker();
        $seekerB = $this->makeJobSeeker();
        $result  = $this->makeCompanyOwner();

        $jobPost = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
        ]);

        Invitation::factory()->create([
            'job_seeker_id' => $seekerB->jobSeeker->id,
            'company_id'    => $result['company']->id,
            'job_post_id'   => $jobPost->id,
        ]);

        $response = $this->getJson('/api/v1/job-seeker/invitations');

        $this->assertApiSuccess($response);
        $this->assertCount(0, $response->json('data'));
    }

    // -------------------------------------------------------------------------
    // Respond to invitations
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_accept_invitation(): void
    {
        $seeker = $this->actingAsJobSeeker();
        $result = $this->makeCompanyOwner();

        $jobPost = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
        ]);

        $invitation = Invitation::factory()->create([
            'job_seeker_id' => $seeker->jobSeeker->id,
            'company_id'    => $result['company']->id,
            'job_post_id'   => $jobPost->id,
            'status'        => 'pending',
        ]);

        $response = $this->patchJson(
            "/api/v1/job-seeker/invitations/{$invitation->id}/respond",
            ['action' => 'accept']
        );

        $this->assertApiSuccess($response);
        $this->assertDatabaseHas('invitations', [
            'id'     => $invitation->id,
            'status' => 'accepted',
        ]);
    }

    public function test_job_seeker_can_decline_invitation(): void
    {
        $seeker = $this->actingAsJobSeeker();
        $result = $this->makeCompanyOwner();

        $jobPost = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
        ]);

        $invitation = Invitation::factory()->create([
            'job_seeker_id' => $seeker->jobSeeker->id,
            'company_id'    => $result['company']->id,
            'job_post_id'   => $jobPost->id,
            'status'        => 'pending',
        ]);

        $response = $this->patchJson(
            "/api/v1/job-seeker/invitations/{$invitation->id}/respond",
            ['action' => 'decline']
        );

        $this->assertApiSuccess($response);
        $this->assertDatabaseHas('invitations', [
            'id'     => $invitation->id,
            'status' => 'declined',
        ]);
    }

    public function test_job_seeker_cannot_respond_to_already_accepted_invitation(): void
    {
        $seeker = $this->actingAsJobSeeker();
        $result = $this->makeCompanyOwner();

        $jobPost = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
        ]);

        $invitation = Invitation::factory()->create([
            'job_seeker_id' => $seeker->jobSeeker->id,
            'company_id'    => $result['company']->id,
            'job_post_id'   => $jobPost->id,
            'status'        => 'accepted',
        ]);

        $this->patchJson(
            "/api/v1/job-seeker/invitations/{$invitation->id}/respond",
            ['action' => 'decline']
        )->assertStatus(422);
    }

    public function test_job_seeker_cannot_respond_to_another_seekers_invitation(): void
    {
        $seekerA = $this->actingAsJobSeeker();
        $seekerB = $this->makeJobSeeker();
        $result  = $this->makeCompanyOwner();

        $jobPost = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
        ]);

        $invitation = Invitation::factory()->create([
            'job_seeker_id' => $seekerB->jobSeeker->id,
            'company_id'    => $result['company']->id,
            'job_post_id'   => $jobPost->id,
            'status'        => 'pending',
        ]);

        $this->patchJson(
            "/api/v1/job-seeker/invitations/{$invitation->id}/respond",
            ['action' => 'accept']
        )->assertStatus(403);
    }

    public function test_respond_requires_valid_action(): void
    {
        $seeker = $this->actingAsJobSeeker();
        $result = $this->makeCompanyOwner();

        $jobPost = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
        ]);

        $invitation = Invitation::factory()->create([
            'job_seeker_id' => $seeker->jobSeeker->id,
            'company_id'    => $result['company']->id,
            'job_post_id'   => $jobPost->id,
            'status'        => 'pending',
        ]);

        $this->patchJson(
            "/api/v1/job-seeker/invitations/{$invitation->id}/respond",
            ['action' => 'ignore']   // invalid
        )->assertStatus(422);
    }
}
