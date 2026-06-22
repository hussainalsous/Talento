<?php

namespace Tests\Feature\Auth;

use App\Mail\ResetPasswordMailable;
use App\Models\JobSeeker;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

/**
 * Issue 2 — forgot/reset password flow.
 */
class PasswordResetTest extends TestCase
{
    // -------------------------------------------------------------------------
    // Forgot password
    // -------------------------------------------------------------------------

    public function test_forgot_password_sends_reset_email_for_existing_user(): void
    {
        Mail::fake();

        User::factory()->create(['email' => 'reset@example.com', 'is_active' => true]);

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'reset@example.com'])
             ->assertStatus(200)
             ->assertJson(['success' => true]);

        Mail::assertSent(ResetPasswordMailable::class, fn ($m) => $m->hasTo('reset@example.com'));
        $this->assertDatabaseHas('password_reset_tokens', ['email' => 'reset@example.com']);
    }

    public function test_forgot_password_returns_generic_success_for_unknown_email(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com'])
             ->assertStatus(200)
             ->assertJson(['success' => true]);

        Mail::assertNothingSent();
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'nobody@example.com']);
    }

    public function test_forgot_password_does_not_send_for_inactive_user(): void
    {
        Mail::fake();

        User::factory()->create(['email' => 'inactive@example.com', 'is_active' => false]);

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'inactive@example.com'])
             ->assertStatus(200);

        Mail::assertNothingSent();
    }

    public function test_forgot_password_requires_valid_email(): void
    {
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'not-an-email'])
             ->assertStatus(422);
    }

    public function test_forgot_password_email_is_logged(): void
    {
        // No Mail::fake — let the SendEmail job run so the email_logs row is written.
        User::factory()->create(['email' => 'reset-logged@example.com', 'is_active' => true]);

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'reset-logged@example.com'])
             ->assertStatus(200);

        $this->assertDatabaseHas('email_logs', [
            'to_email' => 'reset-logged@example.com',
            'subject'  => 'Reset Your Password — Talento',
            'status'   => 'sent',
        ]);
    }

    // -------------------------------------------------------------------------
    // Reset password
    // -------------------------------------------------------------------------

    public function test_reset_password_updates_password_with_valid_token(): void
    {
        $user  = User::factory()->create(['email' => 'r2@example.com', 'password' => 'oldpassword123']);
        $token = Password::broker()->createToken($user);

        $this->postJson('/api/v1/auth/reset-password', [
            'email'                 => 'r2@example.com',
            'token'                 => $token,
            'password'              => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertStatus(200)
          ->assertJson(['success' => true]);

        $this->assertTrue(Hash::check('newpassword123', $user->fresh()->password));
    }

    public function test_reset_password_fails_with_invalid_token(): void
    {
        User::factory()->create(['email' => 'r3@example.com']);

        $this->postJson('/api/v1/auth/reset-password', [
            'email'                 => 'r3@example.com',
            'token'                 => 'totally-invalid-token',
            'password'              => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertStatus(422);
    }

    public function test_reset_password_requires_matching_confirmation(): void
    {
        $user  = User::factory()->create(['email' => 'r4@example.com']);
        $token = Password::broker()->createToken($user);

        $this->postJson('/api/v1/auth/reset-password', [
            'email'                 => 'r4@example.com',
            'token'                 => $token,
            'password'              => 'newpassword123',
            'password_confirmation' => 'different456',
        ])->assertStatus(422);
    }

    public function test_reset_password_revokes_existing_tokens(): void
    {
        $user = User::factory()->create([
            'role'     => 'job_seeker',
            'email'    => 'r5@example.com',
        ]);
        JobSeeker::factory()->create(['user_id' => $user->id]);
        $user->createToken('old-session');

        $this->assertCount(1, $user->fresh()->tokens);

        $token = Password::broker()->createToken($user);

        $this->postJson('/api/v1/auth/reset-password', [
            'email'                 => 'r5@example.com',
            'token'                 => $token,
            'password'              => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertStatus(200);

        $this->assertCount(0, $user->fresh()->tokens);
    }

    public function test_user_can_log_in_with_new_password_after_reset(): void
    {
        $user  = User::factory()->create([
            'role'      => 'job_seeker',
            'email'     => 'r6@example.com',
            'password'  => 'oldpassword123',
            'is_active' => true,
        ]);
        JobSeeker::factory()->create(['user_id' => $user->id]);
        $token = Password::broker()->createToken($user);

        $this->postJson('/api/v1/auth/reset-password', [
            'email'                 => 'r6@example.com',
            'token'                 => $token,
            'password'              => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertStatus(200);

        $this->postJson('/api/v1/auth/login', [
            'email'    => 'r6@example.com',
            'password' => 'newpassword123',
        ])->assertStatus(200)
          ->assertJson(['success' => true]);
    }
}
