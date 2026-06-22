<?php

namespace Tests\Feature\Auth;

use App\Models\EmailLog;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Issue 1 — verification emails (notification path) must land in email_logs,
 * converging with the SendEmail job path. Uses real notification sends (no
 * Notification::fake) so the lifecycle events fire and the listener runs.
 * QUEUE=sync + MAIL=array means the send succeeds in-process.
 */
class EmailLoggingTest extends TestCase
{
    public function test_verification_notification_is_logged_in_email_logs(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
            'email'             => 'log-test@example.com',
        ]);

        $user->sendEmailVerificationNotification();

        $this->assertDatabaseHas('email_logs', [
            'to_email' => 'log-test@example.com',
            'subject'  => 'Verify Your Email Address — Talento',
            'status'   => 'sent',
        ]);
    }

    public function test_verification_log_has_null_sender_id(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
            'email'             => 'system-sender@example.com',
        ]);

        $user->sendEmailVerificationNotification();

        $log = EmailLog::where('to_email', 'system-sender@example.com')->first();
        $this->assertNotNull($log);
        $this->assertNull($log->sender_id);
    }

    public function test_single_notification_produces_exactly_one_log_row(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
            'email'             => 'one-row@example.com',
        ]);

        // sending + sent events both fire for one logical send; idempotency on
        // $notification->id must collapse them into a single row.
        $user->sendEmailVerificationNotification();

        $this->assertSame(1, EmailLog::where('to_email', 'one-row@example.com')->count());
    }

    public function test_resend_endpoint_logs_the_verification_email(): void
    {
        $user = $this->makeJobSeeker([
            'email_verified_at' => null,
            'email'             => 'resend-log@example.com',
        ]);
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/v1/email/verification-notification')
             ->assertStatus(200);

        $this->assertDatabaseHas('email_logs', [
            'to_email' => 'resend-log@example.com',
            'status'   => 'sent',
        ]);
    }
}
