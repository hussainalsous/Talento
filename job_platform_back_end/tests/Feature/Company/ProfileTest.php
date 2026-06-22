<?php

namespace Tests\Feature\Company;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    // -------------------------------------------------------------------------
    // View
    // -------------------------------------------------------------------------

    public function test_company_owner_can_view_company_profile(): void
    {
        ['company' => $company] = $this->actingAsCompanyOwner();

        $response = $this->getJson('/api/v1/company/profile');

        $this->assertApiSuccess($response);
        $this->assertEquals($company->name, $response->json('data.name'));
    }

    public function test_company_member_can_view_company_profile(): void
    {
        $result = $this->makeCompanyOwner();

        // Create a member and act as them
        $member = $this->makeCompanyMember($result['company']);
        \Laravel\Sanctum\Sanctum::actingAs($member, ['*']);

        $response = $this->getJson('/api/v1/company/profile');

        $this->assertApiSuccess($response);
    }

    public function test_job_seeker_cannot_view_company_profile(): void
    {
        $this->actingAsJobSeeker();

        $this->getJson('/api/v1/company/profile')->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    public function test_company_owner_can_update_profile(): void
    {
        $this->actingAsCompanyOwner();

        $response = $this->patchJson('/api/v1/company/profile', [
            'name'        => 'Updated Company Name',
            'description' => 'We build great products.',
            'website'     => 'https://updated.com',
        ]);

        $this->assertApiSuccess($response);
        $this->assertEquals('Updated Company Name', $response->json('data.name'));
    }

    // -------------------------------------------------------------------------
    // Logo upload
    // -------------------------------------------------------------------------

    public function test_company_owner_can_upload_logo(): void
    {
        Storage::fake('public');
        $this->actingAsCompanyOwner();

        $response = $this->postJson('/api/v1/company/logo', [
            'logo' => UploadedFile::fake()->image('logo.png', 200, 200),
        ]);

        $this->assertApiSuccess($response);
        $this->assertNotNull($response->json('data.logo_url'));
    }

    public function test_logo_upload_rejects_non_image_files(): void
    {
        Storage::fake('public');
        $this->actingAsCompanyOwner();

        $this->postJson('/api/v1/company/logo', [
            'logo' => UploadedFile::fake()->create('document.pdf', 500, 'application/pdf'),
        ])->assertStatus(422);
    }
}
