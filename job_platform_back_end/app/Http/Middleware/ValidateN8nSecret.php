<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateN8nSecret
{
    /**
     * Reject any request whose X-N8N-Webhook-Secret header is missing or does not
     * match the configured shared secret. Protects the n8n callback endpoints,
     * which are otherwise unauthenticated.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('services.n8n.webhook_secret');
        $provided = $request->header('X-N8N-Webhook-Secret');

        if (! $expected || ! is_string($provided) || ! hash_equals($expected, $provided)) {
            abort(401, 'Invalid or missing n8n webhook secret.');
        }

        return $next($request);
    }
}
