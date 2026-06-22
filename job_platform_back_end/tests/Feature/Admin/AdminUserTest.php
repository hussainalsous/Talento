<?php

namespace Tests\Feature\Admin;

use App\Models\Admin;
use App\Models\User;
use Tests\TestCase;

class AdminUserTest extends TestCase
{
    public function test_admin_can_list_all_users(): void
    {
        $this->actingAsAdmin();
        $this->makeJobSeeker();
        $this->makeJobSeeker();

        $response = $this->getJson('/api/v1/admin/users');

        $this->assertApiSuccess($response);
        // At least the 2 job seekers + admin itself
        $this->assertGreaterThanOrEqual(3, $response->json('meta.total'));
    }

    public function test_admin_can_filter_users_by_role(): void
    {
        $this->actingAsAdmin();
        $this->makeJobSeeker();
        $this->makeCompanyOwner();

        $response = $this->getJson('/api/v1/admin/users?role=job_seeker');

        $this->assertApiSuccess($response);
        foreach ($response->json('data') as $user) {
            $this->assertEquals('job_seeker', $user['role']);
        }
    }

    public function test_admin_can_deactivate_a_user(): void
    {
        $this->actingAsAdmin();
        $target = $this->makeJobSeeker();

        $response = $this->patchJson("/api/v1/admin/users/{$target->id}/deactivate");

        $this->assertApiSuccess($response);
        $this->assertDatabaseHas('users', ['id' => $target->id, 'is_active' => false]);
    }

    public function test_admin_can_activate_a_deactivated_user(): void
    {
        $this->actingAsAdmin();
        $target = $this->makeJobSeeker(['is_active' => false]);

        $response = $this->patchJson("/api/v1/admin/users/{$target->id}/activate");

        $this->assertApiSuccess($response);
        $this->assertDatabaseHas('users', ['id' => $target->id, 'is_active' => true]);
    }

    public function test_admin_can_create_system_employee(): void
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/v1/admin/system-employees', [
            'first_name'  => 'New',
            'last_name'   => 'Admin',
            'email'       => 'newadmin@portal.com',
            'password'    => 'password123',
            'permissions' => ['manage_users'],
        ]);

        $this->assertApiSuccess($response, 201);
        $this->assertDatabaseHas('users', ['email' => 'newadmin@portal.com', 'role' => 'admin']);
        $this->assertDatabaseHas('admins', ['first_name' => 'New']);
    }

    public function test_admin_can_update_another_admins_permissions(): void
    {
        $this->actingAsAdmin();
        $targetAdminUser = $this->makeAdmin();
        $targetAdmin = Admin::where('user_id', $targetAdminUser->id)->first();

        $response = $this->patchJson(
            "/api/v1/admin/system-employees/{$targetAdmin->id}/permissions",
            ['permissions' => ['manage_users', 'manage_cvs']]
        );

        $this->assertApiSuccess($response);
        $this->assertDatabaseHas('admins', [
            'id' => $targetAdmin->id,
        ]);
        $fresh = $targetAdmin->fresh();
        $this->assertContains('manage_users', $fresh->permissions);
        $this->assertContains('manage_cvs', $fresh->permissions);
    }

    public function test_job_seeker_cannot_access_admin_routes(): void
    {
        $this->actingAsJobSeeker();

        $this->getJson('/api/v1/admin/users')->assertStatus(403);
    }
}
