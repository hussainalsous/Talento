<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Job Seeker Registration
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_register(): void
    {
        $response = $this->postJson('/api/v1/auth/job-seeker/register', [
            'first_name'       => 'Jane',
            'last_name'        => 'Doe',
            'email'            => 'jane@example.com',
            'password'         => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $this->assertApiSuccess($response, 201);
        $response->assertJsonStructure([
            'data' => ['user', 'token'],
        ]);

        $this->assertDatabaseHas('users', ['email' => 'jane@example.com', 'role' => 'job_seeker']);
        $this->assertDatabaseHas('job_seekers', ['first_name' => 'Jane']);
    }

    public function test_registration_requires_unique_email(): void
    {
        $existing = $this->makeJobSeeker(['email' => 'taken@example.com']);

        $response = $this->postJson('/api/v1/auth/job-seeker/register', [
            'first_name'            => 'Bob',
            'last_name'             => 'Smith',
            'email'                 => 'taken@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
                 ->assertJsonPath('errors.email', fn ($v) => count($v) > 0);
    }

    public function test_registration_requires_password_confirmation(): void
    {
        $response = $this->postJson('/api/v1/auth/job-seeker/register', [
            'first_name'            => 'Alice',
            'last_name'             => 'Brown',
            'email'                 => 'alice@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'wrong',
        ]);

        $response->assertStatus(422);
    }

    // -------------------------------------------------------------------------
    // Login
    // -------------------------------------------------------------------------

    public function test_user_can_login_with_correct_credentials(): void
    {
        $user = $this->makeJobSeeker(['email' => 'test@example.com']);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'test@example.com',
            'password' => 'password',
        ]);

        $this->assertApiSuccess($response);
        $response->assertJsonStructure(['data' => ['user', 'token']]);
        $this->assertNotNull($response->json('data.token'));
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $this->makeJobSeeker(['email' => 'test@example.com']);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'test@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
    }

    public function test_inactive_user_cannot_login(): void
    {
        $this->makeJobSeeker([
            'email'     => 'inactive@example.com',
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'inactive@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(422);
    }

    // -------------------------------------------------------------------------
    // Me / Profile
    // -------------------------------------------------------------------------

    public function test_authenticated_user_can_get_their_profile(): void
    {
        $this->actingAsJobSeeker();

        $response = $this->getJson('/api/v1/auth/me');

        $this->assertApiSuccess($response);
        $response->assertJsonPath('data.role', 'job_seeker');
    }

    public function test_unauthenticated_user_cannot_access_me(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    // -------------------------------------------------------------------------
    // Logout
    // -------------------------------------------------------------------------

    public function test_authenticated_user_can_logout(): void
    {
        $this->actingAsJobSeeker();

        $response = $this->postJson('/api/v1/auth/logout');

        $this->assertApiSuccess($response);
    }

    // -------------------------------------------------------------------------
    // Password Update
    // -------------------------------------------------------------------------

    public function test_user_can_update_password(): void
    {
        $this->actingAsJobSeeker();

        $response = $this->patchJson('/api/v1/auth/password', [
            'current_password'      => 'password',
            'password'              => 'newPassword123',
            'password_confirmation' => 'newPassword123',
        ]);

        $this->assertApiSuccess($response);
    }

    public function test_password_update_fails_with_wrong_current_password(): void
    {
        $this->actingAsJobSeeker();

        $response = $this->patchJson('/api/v1/auth/password', [
            'current_password'      => 'wrong-password',
            'password'              => 'newPassword123',
            'password_confirmation' => 'newPassword123',
        ]);

        $response->assertStatus(422);
    }

    // -------------------------------------------------------------------------
    // Company Registration Request (public submit)
    // -------------------------------------------------------------------------

    public function test_anyone_can_submit_company_registration_request(): void
    {
        $response = $this->postJson('/api/v1/auth/company-registration-requests', [
            'company_name'         => 'Acme Corp',
            'registration_number'  => 'REG-99999',
            'requester_first_name' => 'John',
            'requester_last_name'  => 'CEO',
            'requester_email'      => 'john@acme.com',
            'password'             => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $this->assertApiSuccess($response, 201);
        $this->assertDatabaseHas('company_registration_requests', [
            'company_name' => 'Acme Corp',
            'status'       => 'pending',
        ]);
    }
}
