<?php

namespace App\Services;

use App\Jobs\SendEmail;
use App\Mail\ResetPasswordMailable;
use App\Mail\SystemNotificationEmail;
use App\Mail\VerifyRegistrationEmailMailable;
use App\Models\CompanyRegistrationRequest;
use App\Models\JobSeeker;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthService
{
    // A properly-formatted bcrypt hash (cost 12) used solely as a timing guard.
    // When a login attempt references an email that does not exist, Hash::check()
    // is still called against this dummy so the response time matches the path
    // where a real user is found — preventing timing analysis from revealing
    // whether an email is registered. The comparison always returns false.
    private const DUMMY_HASH = '$2y$12$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    private const MAX_ATTEMPTS  = 5;
    private const DECAY_SECONDS = 900; // 15 minutes

    public function __construct(
        private readonly SupabaseNotificationService $notifications,
        private readonly RedisCacheService $cache,
    ) {}

    public function registerJobSeeker(array $data): array
    {
        $result = DB::transaction(function () use ($data) {
            $user = User::create([
                'email'     => $data['email'],
                'phone'     => $data['phone'] ?? null,
                'password'  => Hash::make($data['password']),
                'role'      => 'job_seeker',
                'is_active' => true,
            ]);

            $jobSeeker = JobSeeker::create([
                'user_id'            => $user->id,
                'first_name'         => $data['first_name'],
                'last_name'          => $data['last_name'],
                'location'           => $data['location'] ?? null,
                'preferred_job_type' => $data['preferred_job_type'] ?? null,
                'last_updated_at'    => now(),
            ]);

            $token = $user->createToken('job-seeker-token')->plainTextToken;

            return compact('user', 'jobSeeker', 'token');
        });

        $this->cache->delPattern('admin:users:*');

        $this->notifications->createNotification(
            userId: (int) $result['user']->id,
            title: 'Welcome to Talento!',
            message: "Hi {$result['jobSeeker']->first_name}, your account has been created. Start building your profile to get discovered.",
            data: [
                'type'          => 'welcome',
                'job_seeker_id' => $result['jobSeeker']->id,
            ]
        );

        // Queue the verification email. Called outside the transaction so the
        // user row is guaranteed committed before the job is serialised — the
        // after_commit queue option reinforces this for any dispatches inside
        // transactions, but explicit placement here makes the intent clear.
        $result['user']->sendEmailVerificationNotification();

        return $result;
    }

    public function submitCompanyRegistrationRequest(array $data, ?string $logoPath = null): CompanyRegistrationRequest
    {
        $request = CompanyRegistrationRequest::create([
            'company_name'         => $data['company_name'],
            'registration_number'  => $data['registration_number'],
            'website'              => $data['website'] ?? null,
            'address'              => $data['address'] ?? null,
            'country'              => $data['country'] ?? null,
            'description'          => $data['description'] ?? null,
            'logo_path'            => $logoPath,
            'requester_first_name' => $data['requester_first_name'],
            'requester_last_name'  => $data['requester_last_name'],
            'requester_email'      => $data['requester_email'],
            'requester_phone'      => $data['requester_phone'] ?? null,
            'password'             => Hash::make($data['password']),
            'status'               => 'pending',
        ]);

        // Invalidate admin request cache — AdminService will rebuild from MySQL on next read
        $this->cache->delPattern('admin:company_requests:*');

        $admins = User::whereIn('role', ['admin', 'super_admin'])->get();
        $this->notifications->createForUsers(
            $admins,
            'New Company Registration Request',
            "{$request->company_name} has submitted a registration request for review.",
            [
                'type'         => 'company_registration_request',
                'request_id'   => $request->id,
                'company_name' => $request->company_name,
            ]
        );

        SendEmail::dispatch(
            recipient: $request->requester_email,
            mailable: new SystemNotificationEmail(
                title: 'Company Registration Received',
                message: "Hi {$request->requester_first_name},\n\n"
                    . "We have successfully received your company registration request for {$request->company_name}.\n\n"
                    . "Please check your inbox for a separate email to verify your email address — this step is required before our team begins reviewing your application.\n\n"
                    . "Once verified, our team will contact you within 3–5 business days.\n\n"
                    . "Thank you for choosing our platform.",
            ),
            log: [
                'subject' => 'Company Registration Received',
                'body'    => "Registration request received for {$request->company_name} (#{$request->id}).",
                'id'      => User::where('role', 'admin')->first()?->id,
            ]
        );

        $verificationUrl = URL::temporarySignedRoute(
            'api.v1.email.verify-registration',
            Carbon::now()->addHours(48),
            ['id' => $request->id, 'hash' => sha1($request->requester_email)]
        );

        SendEmail::dispatch(
            recipient: $request->requester_email,
            mailable: new VerifyRegistrationEmailMailable(
                firstName: $request->requester_first_name,
                companyName: $request->company_name,
                verificationUrl: $verificationUrl,
                expiresInHours: 48,
            ),
            log: [
                'subject' => "Verify Your Email — {$request->company_name} Registration",
                'body'    => "Verification email sent to {$request->requester_email} for registration request #{$request->id}.",
                'id'      => null,
            ]
        );

        return $request;
    }

    public function login(string $email, string $password, string $ip): array
    {
        $throttleKey = 'login:' . Str::lower($email) . ':' . $ip;

        // Reject immediately if the caller has exceeded the attempt ceiling.
        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_ATTEMPTS)) {
            Log::warning('security.login_rate_limited', [
                'email'  => $email,
                'ip'     => $ip,
                'reason' => 'rate_limited',
                'at'     => now()->toIso8601String(),
            ]);

            abort(429, 'Too many login attempts. Please try again later.');
        }

        // Always call Hash::check regardless of whether the user exists.
        // Without this, a missing-user response returns instantly (no bcrypt work)
        // while a wrong-password response is slow — a timing oracle that reveals
        // whether an email is registered.
        $user            = User::where('email', $email)->first();
        $passwordCorrect = Hash::check($password, $user?->password ?? self::DUMMY_HASH);

        // Determine the real failure reason for internal logging only.
        // The match short-circuits: is_active is never accessed when $user is null.
        $failureReason = match (true) {
            $user === null     => 'user_not_found',
            ! $passwordCorrect => 'invalid_credentials',
            ! $user->is_active => 'inactive_user',
            default            => null,
        };

        if ($failureReason !== null) {
            RateLimiter::hit($throttleKey, self::DECAY_SECONDS);

            Log::warning('security.login_failed', [
                'email'  => $email,
                'ip'     => $ip,
                'reason' => $failureReason,
                'at'     => now()->toIso8601String(),
            ]);

            // All failure paths return an identical message so attackers cannot
            // distinguish "no such account" from "wrong password" from "inactive".
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Successful authentication — reset the limiter so a legitimate user who
        // previously mistyped their password is not locked out going forward.
        RateLimiter::clear($throttleKey);

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken("{$user->role}-token")->plainTextToken;

        return compact('user', 'token');
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();
    }

    public function updatePassword(User $user, string $newPassword): void
    {
        $user->update(['password' => Hash::make($newPassword)]);

        $currentTokenId = $user->currentAccessToken()->id;
        $user->tokens()->where('id', '!=', $currentTokenId)->delete();

        $this->notifications->createNotification(
            userId: (int) $user->id,
            title: 'Password Changed',
            message: 'Your password was successfully updated. If you did not make this change, contact support immediately.',
            data: [
                'type'    => 'password_changed',
                'user_id' => $user->id,
            ]
        );
    }

    /**
     * Generate a password-reset token and queue the reset email through SendEmail
     * (so it is logged in email_logs like every other system email).
     *
     * Returns void unconditionally and silently no-ops for unknown/inactive
     * accounts — the controller always responds with a generic success message
     * so the endpoint cannot be used to enumerate registered emails, matching
     * the enumeration-protection philosophy already used in login().
     */
    public function sendPasswordResetLink(string $email): void
    {
        $user = User::where('email', $email)->first();

        if (! $user || ! $user->is_active) {
            return;
        }

        // Built-in broker: hashes + stores the token in password_reset_tokens.
        $token = Password::broker()->createToken($user);

        $base     = rtrim((string) config('app.frontend_url', ''), '/');
        $resetUrl = $base . '/reset-password?token=' . $token . '&email=' . urlencode($email);

        $firstName = $user->jobSeeker?->first_name
            ?? $user->companyMember?->first_name
            ?? $user->admin?->first_name
            ?? 'there';

        $expiresInMinutes = (int) config('auth.passwords.users.expire', 60);

        SendEmail::dispatch(
            recipient: $email,
            mailable: new ResetPasswordMailable($firstName, $resetUrl, $expiresInMinutes),
            log: [
                'subject' => 'Reset Your Password — Talento',
                'body'    => "Password reset link sent to {$email}.",
                'id'      => null,
            ]
        );
    }

    /**
     * Validate the reset token via the built-in broker and set the new password.
     * Revokes all existing Sanctum tokens so any leaked session is invalidated.
     *
     * @param  array{email:string,password:string,password_confirmation:string,token:string}  $credentials
     *
     * @throws ValidationException when the token/email is invalid or expired.
     */
    public function resetPassword(array $credentials): void
    {
        $status = Password::broker()->reset(
            $credentials,
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->save();

                // A password reset must invalidate every existing session/token.
                $user->tokens()->delete();

                $this->notifications->createNotification(
                    userId: (int) $user->id,
                    title: 'Password Reset',
                    message: 'Your password was reset successfully. If you did not perform this action, contact support immediately.',
                    data: [
                        'type'    => 'password_reset',
                        'user_id' => $user->id,
                    ]
                );

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }
    }
}
