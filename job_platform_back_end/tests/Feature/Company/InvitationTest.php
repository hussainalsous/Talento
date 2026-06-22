<?php

namespace Tests\Feature\Company;

use App\Models\Invitation;
use App\Models\JobPost;
use App\Models\JobSeeker;
use Tests\TestCase;

class InvitationTest extends TestCase
{
    // -------------------------------------------------------------------------
    // Send invitation
    // -------------------------------------------------------------------------

    public function test_company_owner_can_invite_a_job_seeker(): void
    {
        ['user' => $user, 'company' => $company] = $this->actingAsCompanyOwner();

        $jobPost = JobPost::factory()->create([
            'company_id' => $company->id,
            'created_by' => $user->id,
            'status'     => 'published',
        ]);

        $seeker = $this->makeJobSeeker();
        JobSeeker::where('user_id', $seeker->id)
                 ->update(['profile_visibility' => 'public']);

        $response = $this->postJson('/api/v1/company/invitations', [
            'job_seeker_id' => $seeker->jobSeeker->id,
            'job_post_id'   => $jobPost->id,
            'message'       => 'We think you would be a great fit!',
        ]);

        $this->assertApiSuccess($response, 201);
        $this->assertDatabaseHas('invitations', [
            'job_seeker_id' => $seeker->jobSeeker->id,
            'job_post_id'   => $jobPost->id,
            'company_id'    => $company->id,
            'status'        => 'pending',
        ]);
    }

    public function test_company_cannot_invite_same_seeker_twice_for_same_post(): void
    {
        ['user' => $user, 'company' => $company] = $this->actingAsCompanyOwner();

        $jobPost = JobPost::factory()->create([
            'company_id' => $company->id,
            'created_by' => $user->id,
            'status'     => 'published',
        ]);

        $seeker = $this->makeJobSeeker();

        Invitation::factory()->create([
            'company_id'    => $company->id,
            'job_post_id'   => $jobPost->id,
            'job_seeker_id' => $seeker->jobSeeker->id,
            'status'        => 'pending',
        ]);

        $this->postJson('/api/v1/company/invitations', [
            'job_seeker_id' => $seeker->jobSeeker->id,
            'job_post_id'   => $jobPost->id,
            'message'       => 'Trying again.',
        ])->assertStatus(422);
    }

    public function test_company_cannot_invite_to_another_companys_job_post(): void
    {
        $resultA = $this->makeCompanyOwner();
        $jobPost = JobPost::factory()->create([
            'company_id' => $resultA['company']->id,
            'created_by' => $resultA['user']->id,
            'status'     => 'published',
        ]);

        // Company B tries to send invitation for company A's post
        $this->actingAsCompanyOwner();
        $seeker = $this->makeJobSeeker();

        $this->postJson('/api/v1/company/invitations', [
            'job_seeker_id' => $seeker->jobSeeker->id,
            'job_post_id'   => $jobPost->id,
            'message'       => 'Poaching attempt.',
        ])->assertStatus(422);
    }

    // -------------------------------------------------------------------------
    // List invitations (company side)
    // -------------------------------------------------------------------------

    public function test_company_can_list_their_sent_invitations(): void
    {
        ['user' => $user, 'company' => $company] = $this->actingAsCompanyOwner();

        $seeker  = $this->makeJobSeeker();
        $jobPost = JobPost::factory()->create([
            'company_id' => $company->id,
            'created_by' => $user->id,
        ]);

        Invitation::factory()->count(2)->create([
            'company_id'    => $company->id,
            'job_post_id'   => $jobPost->id,
            'job_seeker_id' => $seeker->jobSeeker->id,
        ]);

        // Another company's invitation — should not appear
        $otherResult = $this->makeCompanyOwner();
        $otherPost   = JobPost::factory()->create([
            'company_id' => $otherResult['company']->id,
            'created_by' => $otherResult['user']->id,
        ]);
        Invitation::factory()->create([
            'company_id'    => $otherResult['company']->id,
            'job_post_id'   => $otherPost->id,
            'job_seeker_id' => $seeker->jobSeeker->id,
        ]);

        \Laravel\Sanctum\Sanctum::actingAs($user, ['*']);

        $response = $this->getJson('/api/v1/company/invitations');

        $this->assertApiSuccess($response);
        $this->assertCount(2, $response->json('data'));
    }
}
