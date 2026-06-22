<?php

namespace Tests\Feature\Company;

use App\Models\CV;
use App\Models\JobSeeker;
use Tests\TestCase;

class CandidatePrivacyTest extends TestCase
{
    // -------------------------------------------------------------------------
    // Candidate search / listing — company side
    // -------------------------------------------------------------------------

    public function test_company_can_see_public_profiles(): void
    {
        $this->actingAsCompanyOwner();

        $seeker = $this->makeJobSeeker();
        JobSeeker::where('user_id', $seeker->id)
                 ->update(['profile_visibility' => 'public']);

        $response = $this->getJson('/api/v1/company/candidates');

        $this->assertApiSuccess($response);
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($seeker->jobSeeker->id, $ids);
    }

    public function test_company_can_see_limited_profiles(): void
    {
        $this->actingAsCompanyOwner();

        $seeker = $this->makeJobSeeker();
        JobSeeker::where('user_id', $seeker->id)
                 ->update(['profile_visibility' => 'limited']);

        $response = $this->getJson('/api/v1/company/candidates');

        $this->assertApiSuccess($response);
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($seeker->jobSeeker->id, $ids);
    }

    public function test_company_cannot_see_private_profiles(): void
    {
        $this->actingAsCompanyOwner();

        $seeker = $this->makeJobSeeker();
        JobSeeker::where('user_id', $seeker->id)
                 ->update(['profile_visibility' => 'private']);

        $response = $this->getJson('/api/v1/company/candidates');

        $this->assertApiSuccess($response);
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertNotContains($seeker->jobSeeker->id, $ids);
    }

    // -------------------------------------------------------------------------
    // Admin candidate oversight — bypasses privacy filters
    // -------------------------------------------------------------------------

    public function test_admin_can_see_private_profiles(): void
    {
        $this->actingAsAdmin();

        $seeker = $this->makeJobSeeker();
        JobSeeker::where('user_id', $seeker->id)
                 ->update(['profile_visibility' => 'private']);

        $response = $this->getJson('/api/v1/admin/candidates');

        $this->assertApiSuccess($response);
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($seeker->jobSeeker->id, $ids);
    }

    public function test_admin_can_view_private_profile_directly(): void
    {
        $this->actingAsAdmin();

        $seeker = $this->makeJobSeeker();
        JobSeeker::where('user_id', $seeker->id)
                 ->update(['profile_visibility' => 'private']);

        $seekerModel = $seeker->jobSeeker()->first();
        $response = $this->getJson("/api/v1/admin/candidates/{$seekerModel->id}");

        $this->assertApiSuccess($response);
        $this->assertEquals($seekerModel->id, $response->json('data.id'));
    }

    // -------------------------------------------------------------------------
    // Profile detail — masked fields for limited visibility
    // -------------------------------------------------------------------------

    public function test_limited_profile_shows_masked_last_name_to_company(): void
    {
        $this->actingAsCompanyOwner();

        $seeker = $this->makeJobSeeker();
        JobSeeker::where('user_id', $seeker->id)->update([
            'profile_visibility' => 'limited',
            'last_name'          => 'Johnson',
        ]);

        $seekerModel = $seeker->jobSeeker()->first();
        $response    = $this->getJson("/api/v1/company/candidates/{$seekerModel->id}");

        $this->assertApiSuccess($response);
        // Last name should be initial only (e.g. "J.")
        $lastName = $response->json('data.last_name');
        $this->assertMatchesRegularExpression('/^[A-Z]\.$/', $lastName);
    }

    public function test_public_profile_shows_full_name_to_company(): void
    {
        $this->actingAsCompanyOwner();

        $seeker = $this->makeJobSeeker();
        JobSeeker::where('user_id', $seeker->id)->update([
            'profile_visibility' => 'public',
            'last_name'          => 'Johnson',
        ]);

        $seekerModel = $seeker->jobSeeker()->first();
        $response    = $this->getJson("/api/v1/company/candidates/{$seekerModel->id}");

        $this->assertApiSuccess($response);
        $this->assertEquals('Johnson', $response->json('data.last_name'));
    }

    public function test_private_profile_returns_403_to_company(): void
    {
        $this->actingAsCompanyOwner();

        $seeker = $this->makeJobSeeker();
        JobSeeker::where('user_id', $seeker->id)
                 ->update(['profile_visibility' => 'private']);

        $seekerModel = $seeker->jobSeeker()->first();

        $this->getJson("/api/v1/company/candidates/{$seekerModel->id}")
             ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // CV visibility embedded in profile show
    // -------------------------------------------------------------------------

    public function test_company_sees_primary_cv_when_cv_is_public(): void
    {
        $this->actingAsCompanyOwner();

        $seeker = $this->makeJobSeeker();
        JobSeeker::where('user_id', $seeker->id)
                 ->update(['profile_visibility' => 'public', 'cv_visibility' => 'public']);

        $cv = CV::factory()->create([
            'job_seeker_id' => $seeker->jobSeeker->id,
            'visibility'    => 'public',
            'is_primary'    => true,
        ]);

        $seekerModel = $seeker->jobSeeker()->first();
        $response    = $this->getJson("/api/v1/company/candidates/{$seekerModel->id}");

        $this->assertApiSuccess($response);
        $this->assertNotNull($response->json('data.primary_cv'));
        $this->assertEquals($cv->id, $response->json('data.primary_cv.id'));
    }

    public function test_company_does_not_see_cv_when_cv_is_upon_request(): void
    {
        $this->actingAsCompanyOwner();

        $seeker = $this->makeJobSeeker();
        JobSeeker::where('user_id', $seeker->id)->update([
            'profile_visibility' => 'public',
            'cv_visibility'      => 'upon_request',
        ]);

        CV::factory()->create([
            'job_seeker_id' => $seeker->jobSeeker->id,
            'visibility'    => 'upon_request',
            'is_primary'    => true,
        ]);

        $seekerModel = $seeker->jobSeeker()->first();
        $response    = $this->getJson("/api/v1/company/candidates/{$seekerModel->id}");

        $this->assertApiSuccess($response);
        // primary_cv should be absent/null — company must request access
        $this->assertNull($response->json('data.primary_cv'));
    }

    public function test_admin_can_view_any_cv_directly(): void
    {
        $this->actingAsAdmin();

        $seeker = $this->makeJobSeeker();
        $cv = CV::factory()->create([
            'job_seeker_id' => $seeker->jobSeeker->id,
            'visibility'    => 'private',
            'is_primary'    => true,
        ]);

        $response = $this->getJson("/api/v1/admin/cvs/{$cv->id}");

        $this->assertApiSuccess($response);
        $this->assertEquals($cv->id, $response->json('data.id'));
    }

    public function test_job_seeker_can_list_own_cvs(): void
    {
        $seeker = $this->actingAsJobSeeker();

        CV::factory()->count(2)->create([
            'job_seeker_id' => $seeker->jobSeeker->id,
        ]);

        $response = $this->getJson('/api/v1/job-seeker/cvs');

        $this->assertApiSuccess($response);
        $this->assertCount(2, $response->json('data'));
    }
}
