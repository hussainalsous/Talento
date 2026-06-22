<?php

namespace Tests\Feature\Admin;

use App\Models\Admin;
use App\Models\CompanyRegistrationRequest;
use Tests\TestCase;

class CompanyRegistrationRequestTest extends TestCase
{
    // -------------------------------------------------------------------------
    // Listing
    // -------------------------------------------------------------------------

    public function test_admin_can_list_registration_requests(): void
    {
        $this->actingAsAdmin();
        CompanyRegistrationRequest::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/admin/company-registration-requests');

        $this->assertApiSuccess($response);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_non_admin_cannot_list_registration_requests(): void
    {
        $this->actingAsJobSeeker();

        $this->getJson('/api/v1/admin/company-registration-requests')
             ->assertStatus(403);
    }

    public function test_admin_can_filter_requests_by_status(): void
    {
        $this->actingAsAdmin();
        CompanyRegistrationRequest::factory()->count(2)->create(['status' => 'pending']);
        CompanyRegistrationRequest::factory()->count(1)->create(['status' => 'approved']);

        $response = $this->getJson('/api/v1/admin/company-registration-requests?status=pending');

        $this->assertApiSuccess($response);
        $this->assertCount(2, $response->json('data'));
    }

    // -------------------------------------------------------------------------
    // Approve
    // -------------------------------------------------------------------------

    public function test_admin_can_approve_pending_registration_request(): void
    {
        $adminUser = $this->actingAsAdmin();
        $admin = Admin::where('user_id', $adminUser->id)->first();

        $request = CompanyRegistrationRequest::factory()->create(['status' => 'pending']);

        $response = $this->patchJson(
            "/api/v1/admin/company-registration-requests/{$request->id}/approve"
        );

        $this->assertApiSuccess($response);

        // A company and user should now exist
        $this->assertDatabaseHas('companies', [
            'name' => $request->company_name,
            'approval_status' => 'approved',
        ]);
        $this->assertDatabaseHas('users', [
            'email' => $request->requester_email,
            'role'  => 'company_owner',
        ]);
        $this->assertDatabaseHas('company_registration_requests', [
            'id'     => $request->id,
            'status' => 'approved',
        ]);
    }

    public function test_admin_cannot_approve_already_reviewed_request(): void
    {
        $this->actingAsAdmin();
        $request = CompanyRegistrationRequest::factory()->create(['status' => 'rejected']);

        $response = $this->patchJson(
            "/api/v1/admin/company-registration-requests/{$request->id}/approve"
        );

        // 409 Conflict: resource is already in a final reviewed state
        $response->assertStatus(409);
    }

    // -------------------------------------------------------------------------
    // Reject
    // -------------------------------------------------------------------------

    public function test_admin_can_reject_pending_registration_request(): void
    {
        $this->actingAsAdmin();
        $request = CompanyRegistrationRequest::factory()->create(['status' => 'pending']);

        $response = $this->patchJson(
            "/api/v1/admin/company-registration-requests/{$request->id}/reject",
            [
                'action'           => 'reject',
                'rejection_reason' => 'Incomplete documentation.',
            ]
        );

        $this->assertApiSuccess($response);
        $this->assertDatabaseHas('company_registration_requests', [
            'id'               => $request->id,
            'status'           => 'rejected',
            'rejection_reason' => 'Incomplete documentation.',
        ]);

        // No user account should be created
        $this->assertDatabaseMissing('users', ['email' => $request->requester_email]);
    }

    public function test_rejection_requires_a_reason(): void
    {
        $this->actingAsAdmin();
        $request = CompanyRegistrationRequest::factory()->create(['status' => 'pending']);

        $response = $this->patchJson(
            "/api/v1/admin/company-registration-requests/{$request->id}/reject",
            ['action' => 'reject'] // missing rejection_reason
        );

        $response->assertStatus(422);
    }
}
