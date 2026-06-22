<?php

namespace Tests;

use App\Models\Admin;
use App\Models\Company;
use App\Models\CompanyMember;
use App\Models\JobSeeker;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Redis;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        try {
            Redis::flushdb();
        } catch (\Throwable) {
            // Redis unavailable — no-op
        }
    }

    // -------------------------------------------------------------------------
    // User / auth helpers
    // -------------------------------------------------------------------------

    protected function makeAdmin(array $overrides = []): User
    {
        $user = User::factory()->create(array_merge([
            'role'      => 'admin',
            'is_active' => true,
        ], $overrides));

        Admin::factory()->create(['user_id' => $user->id]);

        return $user;
    }

    protected function makeJobSeeker(array $overrides = []): User
    {
        $user = User::factory()->create(array_merge([
            'role'              => 'job_seeker',
            'is_active'         => true,
            'email_verified_at' => now(),
        ], $overrides));

        JobSeeker::factory()->create(['user_id' => $user->id]);

        return $user;
    }

    protected function makeCompanyOwner(array $companyOverrides = []): array
    {
        $user = User::factory()->create([
            'role'      => 'company_owner',
            'is_active' => true,
        ]);

        $company = Company::factory()->create(array_merge([
            'owner_user_id'   => $user->id,
            'approval_status' => 'approved',
        ], $companyOverrides));

        CompanyMember::factory()->create([
            'user_id'         => $user->id,
            'company_id'      => $company->id,
            'role_in_company' => 'owner',
        ]);

        return compact('user', 'company');
    }

    protected function makeCompanyMember(Company $company, array $overrides = []): User
    {
        $user = User::factory()->create(array_merge([
            'role'      => 'company_member',
            'is_active' => true,
        ], $overrides));

        CompanyMember::factory()->create([
            'user_id'         => $user->id,
            'company_id'      => $company->id,
            'role_in_company' => 'member',
        ]);

        return $user;
    }

    protected function actingAsAdmin(array $overrides = []): User
    {
        $user = $this->makeAdmin($overrides);
        Sanctum::actingAs($user, ['*']);
        return $user;
    }

    protected function actingAsJobSeeker(array $overrides = []): User
    {
        $user = $this->makeJobSeeker($overrides);
        Sanctum::actingAs($user, ['*']);
        return $user;
    }

    protected function actingAsCompanyOwner(array $companyOverrides = []): array
    {
        $result = $this->makeCompanyOwner($companyOverrides);
        Sanctum::actingAs($result['user'], ['*']);
        return $result;
    }

    // -------------------------------------------------------------------------
    // Assertion helpers
    // -------------------------------------------------------------------------

    protected function assertApiSuccess(\Illuminate\Testing\TestResponse $response, int $status = 200): void
    {
        $response->assertStatus($status)
                 ->assertJsonPath('success', true);
    }

    protected function assertApiError(\Illuminate\Testing\TestResponse $response, int $status): void
    {
        $response->assertStatus($status)
                 ->assertJsonPath('success', false);
    }
}
