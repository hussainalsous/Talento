<?php

namespace Tests\Feature\Admin;

use App\Models\Plan;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    // -------------------------------------------------------------------------
    // Plans
    // -------------------------------------------------------------------------

    public function test_admin_can_list_plans(): void
    {
        $this->actingAsAdmin();
        Plan::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/admin/plans');

        $this->assertApiSuccess($response);
        $this->assertGreaterThanOrEqual(3, count($response->json('data')));
    }

    public function test_non_admin_cannot_list_plans(): void
    {
        $this->actingAsJobSeeker();

        $this->getJson('/api/v1/admin/plans')->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Subscriptions list
    // -------------------------------------------------------------------------

    public function test_admin_can_list_all_subscriptions(): void
    {
        $this->actingAsAdmin();

        $response = $this->getJson('/api/v1/admin/subscriptions');

        $this->assertApiSuccess($response);
        $response->assertJsonStructure(['data', 'meta']);
    }

    // -------------------------------------------------------------------------
    // Assign subscription to company
    // -------------------------------------------------------------------------

    public function test_admin_can_assign_a_plan_to_a_company(): void
    {
        $this->actingAsAdmin();
        $plan    = Plan::factory()->create();
        $result  = $this->makeCompanyOwner();
        $company = $result['company'];

        $response = $this->postJson(
            "/api/v1/admin/companies/{$company->id}/subscriptions",
            [
                'plan_id'    => $plan->id,
                'starts_at'  => now()->toDateString(),
                'expires_at' => now()->addYear()->toDateString(),
            ]
        );

        $this->assertApiSuccess($response, 201);
        $this->assertDatabaseHas('subscriptions', [
            'company_id' => $company->id,
            'plan_id'    => $plan->id,
        ]);
    }

    public function test_assign_subscription_requires_valid_plan(): void
    {
        $this->actingAsAdmin();
        $result  = $this->makeCompanyOwner();

        $this->postJson(
            "/api/v1/admin/companies/{$result['company']->id}/subscriptions",
            ['plan_id' => 99999] // non-existent
        )->assertStatus(422);
    }

    public function test_job_seeker_cannot_assign_subscriptions(): void
    {
        $this->actingAsJobSeeker();
        $result = $this->makeCompanyOwner();

        $this->postJson(
            "/api/v1/admin/companies/{$result['company']->id}/subscriptions",
            ['plan_id' => 1]
        )->assertStatus(403);
    }
}
