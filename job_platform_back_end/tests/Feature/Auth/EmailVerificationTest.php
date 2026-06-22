<?php

namespace Tests\Feature\Auth;

use App\Mail\VerifyEmailMailable;
use App\Mail\VerifyRegistrationEmailMailable;
use App\Models\CompanyRegistrationRequest;
use App\Models\JobPost;
use App\Models\JobSeeker;
use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    // =========================================================================
    // SECTION 1 — Registration: unverified user + notification dispatched
    // =========================================================================

    public function test_registration_creates_user_with_null_email_verified_at(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/job-seeker/register', [
            'first_name'            => 'Jane',
            'last_name'             => 'Doe',
            'email'                 => 'jane@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $user = User::where('email', 'jane@example.com')->first();
        $this->assertNull($user->email_verified_at);
    }

    public function test_registration_dispatches_verify_email_notification(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/job-seeker/register', [
            'first_name'            => 'Jane',
            'last_name'             => 'Doe',
            'email'                 => 'jane@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $user = User::where('email', 'jane@example.com')->first();
        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    // =========================================================================
    // SECTION 2 — Valid verification link stamps email_verified_at
    // =========================================================================

    public function test_valid_signed_link_marks_email_as_verified(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);
        $url  = $this->makeVerifyUrl($user);

        $response = $this->getJson($url);

        $response->assertStatus(200)
                 ->assertJson(['success' => true]);

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_verification_does_not_change_other_user_fields(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);
        $before = $user->only(['email', 'role', 'is_active']);

        $this->getJson($this->makeVerifyUrl($user));

        $user->refresh();
        $this->assertEquals($before['email'],     $user->email);
        $this->assertEquals($before['role'],      $user->role);
        $this->assertEquals($before['is_active'], $user->is_active);
    }

    // =========================================================================
    // SECTION 3 — Already verified
    // =========================================================================

    public function test_already_verified_user_gets_success_with_already_verified_message(): void
    {
        $user = User::factory()->verified()->create();
        $url  = $this->makeVerifyUrl($user);

        $response = $this->getJson($url);

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Your email address is already verified.',
                 ]);
    }

    public function test_already_verified_user_database_is_not_changed(): void
    {
        $user       = User::factory()->verified()->create();
        $originalTs = $user->email_verified_at->toISOString();

        $this->getJson($this->makeVerifyUrl($user));

        $this->assertEquals($originalTs, $user->fresh()->email_verified_at->toISOString());
    }

    // =========================================================================
    // SECTION 4 — Expired link
    // =========================================================================

    public function test_expired_link_returns_403(): void
    {
        Carbon::setTestNow(now());

        $user = User::factory()->create(['email_verified_at' => null]);
        $url  = $this->makeVerifyUrl($user, now()->addMinutes(60));

        Carbon::setTestNow(now()->addMinutes(61));
        $response = $this->getJson($url);
        Carbon::setTestNow();

        $response->assertStatus(403)
                 ->assertJson(['success' => false]);
    }

    public function test_expired_link_does_not_verify_email(): void
    {
        Carbon::setTestNow(now());

        $user = User::factory()->create(['email_verified_at' => null]);
        $url  = $this->makeVerifyUrl($user, now()->addMinutes(60));

        Carbon::setTestNow(now()->addMinutes(61));
        $this->getJson($url);
        Carbon::setTestNow();

        $this->assertNull($user->fresh()->email_verified_at);
    }

    // =========================================================================
    // SECTION 5 — Invalid signature (tampered URL)
    // =========================================================================

    public function test_tampered_signature_returns_403(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);
        $url  = $this->makeVerifyUrl($user) . 'X';

        $this->getJson($url)
             ->assertStatus(403)
             ->assertJson(['success' => false]);
    }

    public function test_tampered_signature_does_not_verify_email(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);

        $this->getJson($this->makeVerifyUrl($user) . 'X');

        $this->assertNull($user->fresh()->email_verified_at);
    }

    // =========================================================================
    // SECTION 6 — Valid signature but wrong hash
    // =========================================================================

    public function test_wrong_hash_returns_403(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);

        // URL is properly signed but the hash in the path is for a different email.
        // hasValidSignature() passes; hash_equals() fails.
        $url = URL::temporarySignedRoute(
            'api.v1.email.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1('totally-different@example.com')]
        );

        $this->getJson($url)
             ->assertStatus(403)
             ->assertJson(['success' => false]);
    }

    public function test_wrong_hash_does_not_verify_email(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);

        $url = URL::temporarySignedRoute(
            'api.v1.email.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1('totally-different@example.com')]
        );

        $this->getJson($url);

        $this->assertNull($user->fresh()->email_verified_at);
    }

    // =========================================================================
    // SECTION 7 — Non-existent user ID
    // =========================================================================

    public function test_nonexistent_user_id_returns_404(): void
    {
        $url = URL::temporarySignedRoute(
            'api.v1.email.verify',
            now()->addMinutes(60),
            ['id' => 99999, 'hash' => sha1('ghost@example.com')]
        );

        $this->getJson($url)->assertStatus(404);
    }

    // =========================================================================
    // SECTION 8 — Resend endpoint: auth, dispatch, already-verified
    // =========================================================================

    public function test_resend_requires_authentication(): void
    {
        $this->postJson('/api/v1/email/verification-notification')
             ->assertStatus(401);
    }

    public function test_resend_dispatches_notification_for_unverified_user(): void
    {
        Notification::fake();

        $user = $this->makeJobSeeker(['email_verified_at' => null]);
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/v1/email/verification-notification')
             ->assertStatus(200)
             ->assertJson(['success' => true]);

        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    public function test_resend_on_verified_user_returns_already_verified_without_sending(): void
    {
        Notification::fake();

        $this->actingAsJobSeeker(); // verified by default

        $this->postJson('/api/v1/email/verification-notification')
             ->assertStatus(200)
             ->assertJson([
                 'success' => true,
                 'message' => 'Your email address is already verified.',
             ]);

        Notification::assertNothingSent();
    }

    // =========================================================================
    // SECTION 9 — Rate limiting on resend
    // =========================================================================

    public function test_resend_is_throttled_after_six_requests(): void
    {
        Notification::fake();

        $user = $this->makeJobSeeker(['email_verified_at' => null]);
        Sanctum::actingAs($user, ['*']);

        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/v1/email/verification-notification')
                 ->assertStatus(200);
        }

        $this->postJson('/api/v1/email/verification-notification')
             ->assertStatus(429);
    }

    // =========================================================================
    // SECTION 10 — Middleware: verified gate blocks unverified users
    // =========================================================================

    public function test_unverified_user_cannot_upload_cv(): void
    {
        Storage::fake('public');

        $user = $this->makeJobSeeker(['email_verified_at' => null]);
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/v1/job-seeker/cvs', [
            'file'       => UploadedFile::fake()->create('resume.pdf', 200, 'application/pdf'),
            'title'      => 'My CV',
            'is_primary' => true,
            'visibility' => 'public',
        ])->assertStatus(403)
          ->assertJson(['success' => false, 'email_verified' => false]);
    }

    public function test_verified_user_can_upload_cv(): void
    {
        Storage::fake('public');

        $this->actingAsJobSeeker(); // verified

        $this->postJson('/api/v1/job-seeker/cvs', [
            'file'       => UploadedFile::fake()->create('resume.pdf', 200, 'application/pdf'),
            'title'      => 'My CV',
            'is_primary' => true,
            'visibility' => 'public',
        ])->assertStatus(201);
    }

    public function test_unverified_user_cannot_apply_to_job(): void
    {
        $seeker  = $this->makeJobSeeker(['email_verified_at' => null]);
        $result  = $this->makeCompanyOwner();
        $jobPost = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'status'     => 'published',
        ]);

        Sanctum::actingAs($seeker, ['*']);

        $this->postJson("/api/v1/job-posts/{$jobPost->id}/apply", ['cover_letter' => 'Hi'])
             ->assertStatus(403)
             ->assertJson(['success' => false, 'email_verified' => false]);
    }

    public function test_verified_user_can_apply_to_job(): void
    {
        $seeker  = $this->actingAsJobSeeker(); // verified
        $result  = $this->makeCompanyOwner();
        $jobPost = JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'status'     => 'published',
        ]);

        $this->postJson("/api/v1/job-posts/{$jobPost->id}/apply", ['cover_letter' => 'Hi'])
             ->assertStatus(201);
    }

    // =========================================================================
    // SECTION 11 — Company registration pre-verification
    // =========================================================================

    public function test_submitting_company_registration_dispatches_verification_email(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/auth/company-registration-requests', [
            'company_name'          => 'Acme Corp',
            'registration_number'   => 'REG-12345',
            'requester_first_name'  => 'John',
            'requester_last_name'   => 'Doe',
            'requester_email'       => 'john@acme.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        Mail::assertSent(VerifyRegistrationEmailMailable::class, function ($mail) {
            return $mail->hasTo('john@acme.com');
        });
    }

    public function test_submitting_company_registration_creates_request_with_null_email_verified_at(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/auth/company-registration-requests', [
            'company_name'          => 'Acme Corp',
            'registration_number'   => 'REG-77777',
            'requester_first_name'  => 'Alice',
            'requester_last_name'   => 'Smith',
            'requester_email'       => 'alice@acme.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $req = CompanyRegistrationRequest::where('requester_email', 'alice@acme.com')->first();
        $this->assertNull($req->email_verified_at);
    }

    public function test_valid_company_registration_verification_link_stamps_verified_at(): void
    {
        $req = CompanyRegistrationRequest::factory()->create(['email_verified_at' => null]);
        $url = $this->makeRegistrationVerifyUrl($req);

        $response = $this->getJson($url);

        $response->assertStatus(200)
                 ->assertJson(['success' => true]);

        $this->assertNotNull($req->fresh()->email_verified_at);
    }

    public function test_already_verified_company_registration_request_returns_already_verified(): void
    {
        $req = CompanyRegistrationRequest::factory()->emailVerified()->create();
        $url = $this->makeRegistrationVerifyUrl($req);

        $this->getJson($url)
             ->assertStatus(200)
             ->assertJson([
                 'success' => true,
                 'message' => 'Your email address is already verified.',
             ]);
    }

    public function test_expired_company_registration_verification_link_returns_403(): void
    {
        Carbon::setTestNow(now());

        $req = CompanyRegistrationRequest::factory()->create(['email_verified_at' => null]);
        $url = $this->makeRegistrationVerifyUrl($req, now()->addHours(48));

        Carbon::setTestNow(now()->addHours(49));
        $response = $this->getJson($url);
        Carbon::setTestNow();

        $response->assertStatus(403)
                 ->assertJson(['success' => false]);

        $this->assertNull($req->fresh()->email_verified_at);
    }

    // =========================================================================
    // SECTION 12 — Company approval: transfer / send verification
    // =========================================================================

    public function test_approval_of_pre_verified_request_creates_verified_user(): void
    {
        Notification::fake();
        Mail::fake();

        $this->actingAsAdmin();

        $req = CompanyRegistrationRequest::factory()->create([
            'status'            => 'pending',
            'email_verified_at' => now()->subHour(),
        ]);

        $this->patchJson("/api/v1/admin/company-registration-requests/{$req->id}/approve")
             ->assertStatus(200);

        $user = User::where('email', $req->requester_email)->first();
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_approval_of_pre_verified_request_sends_no_verify_notification(): void
    {
        Notification::fake();
        Mail::fake();

        $this->actingAsAdmin();

        $req = CompanyRegistrationRequest::factory()->create([
            'status'            => 'pending',
            'email_verified_at' => now()->subHour(),
        ]);

        $this->patchJson("/api/v1/admin/company-registration-requests/{$req->id}/approve");

        Notification::assertNothingSent();
    }

    public function test_approval_of_unverified_request_creates_unverified_user(): void
    {
        Notification::fake();
        Mail::fake();

        $this->actingAsAdmin();

        $req = CompanyRegistrationRequest::factory()->create([
            'status'            => 'pending',
            'email_verified_at' => null,
        ]);

        $this->patchJson("/api/v1/admin/company-registration-requests/{$req->id}/approve");

        $user = User::where('email', $req->requester_email)->first();
        $this->assertNull($user->email_verified_at);
    }

    public function test_approval_of_unverified_request_dispatches_verify_notification(): void
    {
        Notification::fake();
        Mail::fake();

        $this->actingAsAdmin();

        $req = CompanyRegistrationRequest::factory()->create([
            'status'            => 'pending',
            'email_verified_at' => null,
        ]);

        $this->patchJson("/api/v1/admin/company-registration-requests/{$req->id}/approve");

        $user = User::where('email', $req->requester_email)->first();
        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    // =========================================================================
    // SECTION 13 — UserResource exposes email_verified_at
    // =========================================================================

    public function test_me_endpoint_exposes_email_verified_at_for_unverified_user(): void
    {
        $user = $this->makeJobSeeker(['email_verified_at' => null]);
        Sanctum::actingAs($user, ['*']);

        $this->getJson('/api/v1/auth/me')
             ->assertJsonPath('data.email_verified_at', null);
    }

    public function test_me_endpoint_exposes_email_verified_at_for_verified_user(): void
    {
        $this->actingAsJobSeeker(); // verified

        $response = $this->getJson('/api/v1/auth/me');

        $this->assertNotNull($response->json('data.email_verified_at'));
    }

    // =========================================================================
    // SECTION 14 — Frontend redirect contract
    // =========================================================================

    public function test_successful_verification_redirects_to_frontend_email_verified_page(): void
    {
        config(['app.frontend_url' => 'http://localhost:5173']);
        $user = User::factory()->create(['email_verified_at' => null]);

        $this->get($this->makeVerifyUrl($user))
             ->assertRedirect('http://localhost:5173/email-verified');
    }

    public function test_already_verified_redirects_to_frontend_already_verified_page(): void
    {
        config(['app.frontend_url' => 'http://localhost:5173']);
        $user = User::factory()->verified()->create();

        $this->get($this->makeVerifyUrl($user))
             ->assertRedirect('http://localhost:5173/email-already-verified');
    }

    public function test_expired_link_redirects_to_frontend_expired_page(): void
    {
        config(['app.frontend_url' => 'http://localhost:5173']);
        $user = User::factory()->create(['email_verified_at' => null]);

        // Use a past expiry so both hasValidSignature() (Carbon) and time() agree it's expired.
        $url = $this->makeVerifyUrl($user, Carbon::now()->subSecond());

        $this->get($url)->assertRedirect('http://localhost:5173/email-verification-expired');
    }

    public function test_invalid_signature_redirects_to_frontend_invalid_page(): void
    {
        config(['app.frontend_url' => 'http://localhost:5173']);
        $user = User::factory()->create(['email_verified_at' => null]);

        $this->get($this->makeVerifyUrl($user) . 'X')
             ->assertRedirect('http://localhost:5173/email-verification-invalid');
    }

    public function test_company_registration_verification_redirects_to_frontend(): void
    {
        config(['app.frontend_url' => 'http://localhost:5173']);
        $req = CompanyRegistrationRequest::factory()->create(['email_verified_at' => null]);

        $this->get($this->makeRegistrationVerifyUrl($req))
             ->assertRedirect('http://localhost:5173/email-verified');
    }

    // =========================================================================
    // SECTION 15 — Email mailable content
    // =========================================================================

    public function test_verify_email_mailable_has_correct_subject(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);

        (new VerifyEmailMailable($user, 'https://example.com/verify', 60))
            ->assertHasSubject('Verify Your Email Address — Talento');
    }

    public function test_verify_email_mailable_contains_verification_url_in_html(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);

        (new VerifyEmailMailable($user, 'https://example.com/email/verify/test-path', 60))
            ->assertSeeInHtml('https://example.com/email/verify/test-path');
    }

    public function test_verify_email_mailable_greets_job_seeker_by_first_name(): void
    {
        $user      = $this->makeJobSeeker();
        $firstName = $user->jobSeeker->first_name;

        (new VerifyEmailMailable($user, 'https://example.com/verify', 60))
            ->assertSeeInHtml("Hi <strong>{$firstName}</strong>", false);
    }

    public function test_verify_email_mailable_uses_company_member_name_for_company_owner(): void
    {
        $result    = $this->makeCompanyOwner();
        $user      = $result['user'];
        $firstName = $user->companyMember->first_name;

        (new VerifyEmailMailable($user, 'https://example.com/verify', 60))
            ->assertSeeInHtml("Hi <strong>{$firstName}</strong>", false);
    }

    public function test_verify_registration_email_mailable_has_correct_subject(): void
    {
        (new VerifyRegistrationEmailMailable('John', 'Acme Corp', 'https://example.com/verify', 48))
            ->assertHasSubject('Verify Your Email — Acme Corp Registration');
    }

    public function test_verify_registration_email_mailable_contains_url_and_company_name(): void
    {
        (new VerifyRegistrationEmailMailable('John', 'Acme Corp', 'https://example.com/verify-reg', 48))
            ->assertSeeInHtml('https://example.com/verify-reg')
            ->assertSeeInHtml('Acme Corp');
    }

    // =========================================================================
    // SECTION 16 — Notification URL structure
    // =========================================================================

    public function test_verify_email_notification_url_contains_signed_components(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
            'email'             => 'verify-url-test@example.com',
        ]);

        $mailable = (new VerifyEmailNotification())->toMail($user);
        $url      = $mailable->verificationUrl;

        $this->assertStringContainsString('/api/v1/email/verify/', $url);
        $this->assertStringContainsString((string) $user->id, $url);
        $this->assertStringContainsString(sha1('verify-url-test@example.com'), $url);
        $this->assertStringContainsString('signature=', $url);
        $this->assertStringContainsString('expires=', $url);
        $this->assertStringNotContainsString('//', (string) parse_url($url, PHP_URL_PATH));
    }

    // =========================================================================
    // SECTION 17 — Company registration: security edge cases
    // =========================================================================

    public function test_company_registration_tampered_hash_returns_403(): void
    {
        $req = CompanyRegistrationRequest::factory()->create(['email_verified_at' => null]);

        $url = URL::temporarySignedRoute(
            'api.v1.email.verify-registration',
            now()->addHours(48),
            ['id' => $req->id, 'hash' => sha1('tampered@example.com')]
        );

        $this->getJson($url)
             ->assertStatus(403)
             ->assertJson(['success' => false]);

        $this->assertNull($req->fresh()->email_verified_at);
    }

    public function test_company_registration_tampered_signature_returns_403(): void
    {
        $req = CompanyRegistrationRequest::factory()->create(['email_verified_at' => null]);

        $this->getJson($this->makeRegistrationVerifyUrl($req) . 'X')
             ->assertStatus(403)
             ->assertJson(['success' => false]);

        $this->assertNull($req->fresh()->email_verified_at);
    }

    public function test_nonexistent_company_registration_request_id_returns_404(): void
    {
        $url = URL::temporarySignedRoute(
            'api.v1.email.verify-registration',
            now()->addHours(48),
            ['id' => 99999, 'hash' => sha1('ghost@example.com')]
        );

        $this->getJson($url)->assertStatus(404);
    }

    // =========================================================================
    // SECTION 18 — Auth integration
    // =========================================================================

    public function test_unverified_user_can_log_in_and_receive_token(): void
    {
        $user = User::factory()->create([
            'role'              => 'job_seeker',
            'is_active'         => true,
            'email_verified_at' => null,
            'password'          => 'password123',
        ]);
        JobSeeker::factory()->create(['user_id' => $user->id]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => $user->email,
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $this->assertNotEmpty($response->json('data.token'));
    }

    public function test_registration_response_contains_auth_token(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/v1/auth/job-seeker/register', [
            'first_name'            => 'Token',
            'last_name'             => 'Test',
            'email'                 => 'tokentest@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201);
        $this->assertNotEmpty($response->json('data.token'));
    }

    // =========================================================================
    // SECTION 19 — Factory state coverage
    // =========================================================================

    public function test_user_factory_default_creates_unverified_user(): void
    {
        $this->assertNull(User::factory()->create()->email_verified_at);
    }

    public function test_user_factory_verified_state_creates_verified_user(): void
    {
        $this->assertNotNull(User::factory()->verified()->create()->email_verified_at);
    }

    public function test_company_registration_request_factory_default_has_null_email_verified_at(): void
    {
        $this->assertNull(CompanyRegistrationRequest::factory()->create()->email_verified_at);
    }

    // =========================================================================
    // SECTION 20 — Resend: company owner role
    // =========================================================================

    public function test_unverified_company_owner_can_resend_verification_email(): void
    {
        Notification::fake();

        $result = $this->makeCompanyOwner();
        $user   = $result['user'];
        $user->update(['email_verified_at' => null]);

        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/v1/email/verification-notification')
             ->assertStatus(200)
             ->assertJson(['success' => true]);

        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private function makeVerifyUrl(User $user, ?Carbon $expiresAt = null): string
    {
        return URL::temporarySignedRoute(
            'api.v1.email.verify',
            $expiresAt ?? now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );
    }

    private function makeRegistrationVerifyUrl(
        CompanyRegistrationRequest $req,
        ?Carbon $expiresAt = null
    ): string {
        return URL::temporarySignedRoute(
            'api.v1.email.verify-registration',
            $expiresAt ?? now()->addHours(48),
            ['id' => $req->id, 'hash' => sha1($req->requester_email)]
        );
    }
}
