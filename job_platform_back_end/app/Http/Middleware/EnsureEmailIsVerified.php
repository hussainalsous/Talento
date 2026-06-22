<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * API-aware email verification gate.
 *
 * Laravel's built-in EnsureEmailIsVerified redirects to a web route that does
 * not exist in this API-only project. This middleware returns a JSON 403 so
 * mobile and SPA clients receive a machine-readable response instead of an
 * HTML redirect.
 */
class EnsureEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->hasVerifiedEmail()) {
            return response()->json([
                'success'        => false,
                'message'        => 'Your email address is not verified. Please check your inbox and click the verification link, or request a new one.',
                'email_verified' => false,
            ], 403);
        }

        return $next($request);
    }
}
