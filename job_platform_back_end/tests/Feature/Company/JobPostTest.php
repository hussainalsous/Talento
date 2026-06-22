<?php

namespace Tests\Feature\Company;

use App\Models\JobPost;
use Tests\TestCase;

class JobPostTest extends TestCase
{
    // -------------------------------------------------------------------------
    // Public listing
    // -------------------------------------------------------------------------

    public function test_anyone_can_list_published_job_posts(): void
    {
        $result = $this->makeCompanyOwner();
        JobPost::factory()->count(3)->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'status'     => 'published',
        ]);
        JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'status'     => 'draft',
        ]);

        $response = $this->getJson('/api/v1/job-posts');

        $this->assertApiSuccess($response);
        // Only published posts returned
        $this->assertCount(3, $response->json('data'));
    }

    public function test_job_post_listing_supports_keyword_search(): void
    {
        $result = $this->makeCompanyOwner();
        JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'title'      => 'Senior Laravel Developer',
            'status'     => 'published',
        ]);
        JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'title'      => 'Marketing Manager',
            'status'     => 'published',
        ]);

        $response = $this->getJson('/api/v1/job-posts?search=Laravel');

        $this->assertApiSuccess($response);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Senior Laravel Developer', $response->json('data.0.title'));
    }

    public function test_can_view_single_published_job_post(): void
    {
        $result  = $this->makeCompanyOwner();
        $jobPost = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'status'     => 'published',
        ]);

        $response = $this->getJson("/api/v1/job-posts/{$jobPost->id}");

        $this->assertApiSuccess($response);
        $this->assertEquals($jobPost->title, $response->json('data.title'));
    }

    public function test_cannot_view_draft_job_post_publicly(): void
    {
        $result  = $this->makeCompanyOwner();
        $jobPost = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'status'     => 'draft',
        ]);

        $this->getJson("/api/v1/job-posts/{$jobPost->id}")->assertStatus(404);
    }

    // -------------------------------------------------------------------------
    // Company CRUD
    // -------------------------------------------------------------------------

    public function test_company_owner_can_create_job_post(): void
    {
        // Creating as "published" dispatches JobPostPublished → the queued
        // listener POSTs to n8n; fake the HTTP call so the sync queue succeeds.
        \Illuminate\Support\Facades\Http::fake();

        ['user' => $user, 'company' => $company] = $this->actingAsCompanyOwner();

        $response = $this->postJson('/api/v1/company/job-posts', [
            'title'            => 'Backend Developer',
            'description'      => 'We need a great backend dev.',
            'employment_type'  => 'full_time',
            'status'           => 'published',
            'responsibilities' => ['Build APIs', 'Write tests'],
            'requirements'     => ['PHP', 'Laravel'],
        ]);

        $this->assertApiSuccess($response, 201);
        $this->assertDatabaseHas('job_posts', [
            'company_id' => $company->id,
            'title'      => 'Backend Developer',
        ]);
    }

    public function test_company_owner_can_update_job_post(): void
    {
        ['user' => $user, 'company' => $company] = $this->actingAsCompanyOwner();
        $jobPost = JobPost::factory()->create([
            'company_id' => $company->id,
            'created_by' => $user->id,
        ]);

        $response = $this->patchJson("/api/v1/company/job-posts/{$jobPost->id}", [
            'title'  => 'Updated Title',
            'status' => 'closed',
        ]);

        $this->assertApiSuccess($response);
        $this->assertDatabaseHas('job_posts', [
            'id'     => $jobPost->id,
            'title'  => 'Updated Title',
            'status' => 'closed',
        ]);
    }

    public function test_company_owner_can_soft_delete_job_post(): void
    {
        ['user' => $user, 'company' => $company] = $this->actingAsCompanyOwner();
        $jobPost = JobPost::factory()->create([
            'company_id' => $company->id,
            'created_by' => $user->id,
        ]);

        $response = $this->deleteJson("/api/v1/company/job-posts/{$jobPost->id}");

        $this->assertApiSuccess($response);
        $this->assertSoftDeleted('job_posts', ['id' => $jobPost->id]);
    }

    public function test_company_member_cannot_delete_another_companys_job_post(): void
    {
        // Company A sets up
        $resultA = $this->makeCompanyOwner();
        $jobPost = JobPost::factory()->create([
            'company_id' => $resultA['company']->id,
            'created_by' => $resultA['user']->id,
        ]);

        // Company B member tries to delete it
        $resultB = $this->makeCompanyOwner();
        \Laravel\Sanctum\Sanctum::actingAs($resultB['user'], ['*']);

        $this->deleteJson("/api/v1/company/job-posts/{$jobPost->id}")
             ->assertStatus(403);
    }

    public function test_job_seeker_cannot_create_job_posts(): void
    {
        $this->actingAsJobSeeker();

        $this->postJson('/api/v1/company/job-posts', [
            'title'           => 'Hack Post',
            'description'     => 'Bad actor.',
            'employment_type' => 'full_time',
        ])->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Company views applicants
    // -------------------------------------------------------------------------

    public function test_company_owner_can_view_applicants_for_own_job_post(): void
    {
        ['user' => $user, 'company' => $company] = $this->actingAsCompanyOwner();

        $jobPost   = JobPost::factory()->create(['company_id' => $company->id, 'created_by' => $user->id]);
        $seekerUser = $this->makeJobSeeker();

        \App\Models\JobApplication::factory()->create([
            'job_post_id'   => $jobPost->id,
            'job_seeker_id' => $seekerUser->jobSeeker->id,
        ]);

        $response = $this->getJson("/api/v1/company/job-posts/{$jobPost->id}/applicants");

        $this->assertApiSuccess($response);
        $this->assertCount(1, $response->json('data'));
    }
}
