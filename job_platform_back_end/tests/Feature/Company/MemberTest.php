<?php

namespace Tests\Feature\Company;

use App\Models\CompanyMember;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MemberTest extends TestCase
{
    // -------------------------------------------------------------------------
    // List members
    // -------------------------------------------------------------------------

    public function test_company_owner_can_list_members(): void
    {
        ['user' => $user, 'company' => $company] = $this->actingAsCompanyOwner();

        // Add two extra members
        $this->makeCompanyMember($company);
        $this->makeCompanyMember($company);

        $response = $this->getJson('/api/v1/company/members');

        $this->assertApiSuccess($response);
        // 2 extra + the owner's own member record = 3
        $this->assertGreaterThanOrEqual(2, count($response->json('data')));
    }

    // -------------------------------------------------------------------------
    // Add member
    // -------------------------------------------------------------------------

    public function test_company_owner_can_add_a_member(): void
    {
        $this->actingAsCompanyOwner();

        $response = $this->postJson('/api/v1/company/members', [
            'first_name'      => 'Ali',
            'last_name'       => 'Hassan',
            'email'           => 'ali@acme.com',
            'password'        => 'password123',
            'role_in_company' => 'recruiter',
        ]);

        $this->assertApiSuccess($response, 201);
        $this->assertDatabaseHas('users', ['email' => 'ali@acme.com', 'role' => 'company_member']);
    }

    public function test_add_member_requires_unique_email(): void
    {
        $this->actingAsCompanyOwner();

        // Create a user with the same email first
        $this->makeJobSeeker(['email' => 'taken@acme.com']);

        $this->postJson('/api/v1/company/members', [
            'first_name'      => 'Bob',
            'last_name'       => 'Jones',
            'email'           => 'taken@acme.com',
            'password'        => 'password123',
            'role_in_company' => 'recruiter',
        ])->assertStatus(422);
    }

    // -------------------------------------------------------------------------
    // Update member role
    // -------------------------------------------------------------------------

    public function test_company_owner_can_update_member_role(): void
    {
        ['company' => $company] = $this->actingAsCompanyOwner();
        $member = $this->makeCompanyMember($company);

        $companyMember = CompanyMember::where('user_id', $member->id)->first();

        $response = $this->patchJson("/api/v1/company/members/{$companyMember->id}", [
            'role_in_company' => 'manager',
        ]);

        $this->assertApiSuccess($response);
        $this->assertDatabaseHas('company_members', [
            'id'              => $companyMember->id,
            'role_in_company' => 'manager',
        ]);
    }

    // -------------------------------------------------------------------------
    // Remove member
    // -------------------------------------------------------------------------

    public function test_company_owner_can_remove_a_member(): void
    {
        ['company' => $company] = $this->actingAsCompanyOwner();
        $member = $this->makeCompanyMember($company);

        $companyMember = CompanyMember::where('user_id', $member->id)->first();

        $response = $this->deleteJson("/api/v1/company/members/{$companyMember->id}");

        $this->assertApiSuccess($response);
        $this->assertDatabaseMissing('company_members', ['id' => $companyMember->id]);
    }

    public function test_company_owner_cannot_remove_themselves(): void
    {
        // The owner's own CompanyMember record — removing yourself is blocked (422)
        ['user' => $user, 'company' => $company] = $this->actingAsCompanyOwner();

        $ownRecord = CompanyMember::where('user_id', $user->id)
                                  ->where('company_id', $company->id)
                                  ->first();

        $this->deleteJson("/api/v1/company/members/{$ownRecord->id}")
             ->assertStatus(422);
    }

    public function test_owner_cannot_manage_another_companys_members(): void
    {
        // Company A owner is acting
        $this->actingAsCompanyOwner();

        // Company B has a member
        $resultB = $this->makeCompanyOwner();
        $memberB = $this->makeCompanyMember($resultB['company']);
        $memberRecord = CompanyMember::where('user_id', $memberB->id)->first();

        $this->deleteJson("/api/v1/company/members/{$memberRecord->id}")
             ->assertStatus(403);
    }
}
