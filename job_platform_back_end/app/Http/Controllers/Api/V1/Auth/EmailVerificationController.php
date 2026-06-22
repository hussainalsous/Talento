<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Models\CompanyRegistrationRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class EmailVerificationController extends Controller
{
    /**
     * GET /api/v1/email/verify/{id}/{hash}
     *
     * Validates the signed verification URL and marks the user's email as verified.
     * No Sanctum auth required — the HMAC signature is the credential.
     *
     * When APP_FRONTEND_URL is configured, redirects the browser to the React app
     * so the user sees a proper UI instead of raw JSON.
     * When APP_FRONTEND_URL is empty, falls back to JSON (preserves API client support).
     */
    public function verify(Request $request, int $id, string $hash): JsonResponse|RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            // Distinguish expired from tampered for better UX messaging.
            // Reading 'expires' here is safe — it is not being trusted as a
            // credential; hasValidSignature() already rejected the request.
            $isExpired = $request->query('expires')
                && time() > (int) $request->query('expires');

            return $isExpired
                ? $this->respond(
                    '/email-verification-expired',
                    ['success' => false, 'message' => 'This verification link has expired. Please request a new one.'],
                    403
                )
                : $this->respond(
                    '/email-verification-invalid',
                    ['success' => false, 'message' => 'This verification link is invalid. Please request a new one.'],
                    403
                );
        }

        $user = User::find($id);

        if (! $user) {
            return $this->respond(
                '/email-verification-invalid',
                ['success' => false, 'message' => 'User not found.'],
                404
            );
        }

        if (! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            return $this->respond(
                '/email-verification-invalid',
                ['success' => false, 'message' => 'This verification link is invalid.'],
                403
            );
        }

        if ($user->hasVerifiedEmail()) {
            return $this->respond(
                '/email-already-verified',
                ['success' => true, 'message' => 'Your email address is already verified.'],
                200
            );
        }

        $user->markEmailAsVerified();

        return $this->respond(
            '/email-verified',
            ['success' => true, 'message' => 'Email address verified successfully. You can now access all platform features.'],
            200
        );
    }

    /**
     * GET /api/v1/email/verify-registration/{id}/{hash}
     *
     * Verifies the email address on a CompanyRegistrationRequest BEFORE the admin
     * reviews it. No Sanctum auth — the HMAC signature is the credential.
     * Marks company_registration_requests.email_verified_at so the approval flow
     * can transfer the verified status to the User account when the admin approves.
     */
    public function verifyRegistration(Request $request, int $id, string $hash): JsonResponse|RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            $isExpired = $request->query('expires')
                && time() > (int) $request->query('expires');

            return $isExpired
                ? $this->respond(
                    '/email-verification-expired',
                    ['success' => false, 'message' => 'This verification link has expired.'],
                    403
                )
                : $this->respond(
                    '/email-verification-invalid',
                    ['success' => false, 'message' => 'This verification link is invalid.'],
                    403
                );
        }

        $registrationRequest = CompanyRegistrationRequest::find($id);

        if (! $registrationRequest) {
            return $this->respond(
                '/email-verification-invalid',
                ['success' => false, 'message' => 'Registration request not found.'],
                404
            );
        }

        if (! hash_equals($hash, sha1($registrationRequest->requester_email))) {
            return $this->respond(
                '/email-verification-invalid',
                ['success' => false, 'message' => 'This verification link is invalid.'],
                403
            );
        }

        if ($registrationRequest->hasVerifiedEmail()) {
            return $this->respond(
                '/email-already-verified',
                ['success' => true, 'message' => 'Your email address is already verified.'],
                200
            );
        }

        $registrationRequest->update(['email_verified_at' => now()]);

        return $this->respond(
            '/email-verified',
            ['success' => true, 'message' => 'Email address verified successfully. Your registration request is now under review.'],
            200
        );
    }

    /**
     * POST /api/v1/email/verification-notification
     *
     * Re-sends the verification email to the authenticated user.
     * Always returns JSON — this endpoint is called programmatically by the
     * frontend, never opened directly in a browser from an email link.
     * Throttled to 6 requests per minute via route middleware.
     */
    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'success' => true,
                'message' => 'Your email address is already verified.',
            ]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'success' => true,
            'message' => 'Verification link sent. Please check your inbox.',
        ]);
    }

    /**
     * Returns a redirect to the React frontend when APP_FRONTEND_URL is set,
     * otherwise returns a JSON response for API-only clients (e.g. Flutter).
     * The sensitive URL params (signature, expires, hash) are never forwarded.
     */
    private function respond(
        string $frontendPath,
        array  $json,
        int    $status
    ): JsonResponse|RedirectResponse {
        $base = rtrim(config('app.frontend_url', ''), '/');

        if ($base !== '') {
            return redirect($base . $frontendPath);
        }

        return response()->json($json, $status);
    }
}
