<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\N8nErrorLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class N8nController extends Controller
{
    /**
     * Receive an error report from an n8n workflow, write it to the
     * application log (stack channel) and persist it for later inspection.
     */
    public function logError(Request $request): JsonResponse
    {
        $data = $request->validate([
            'workflow'  => ['nullable', 'string'],
            'node'      => ['nullable', 'string'],
            'error'     => ['nullable', 'string'],
            'failed_at' => ['nullable', 'string'],
        ]);

        try {
            Log::channel('stack')->error('n8n_error', $data);

            N8nErrorLog::create([
                'workflow'  => $data['workflow'] ?? null,
                'node'      => $data['node'] ?? null,
                'error'     => $data['error'] ?? null,
                'failed_at' => $data['failed_at'] ?? null,
            ]);

            return response()->json(['ok' => true]);
        } catch (Throwable $e) {
            Log::error('[n8n] logError failed', ['exception' => $e]);

            return response()->json([
                'ok'    => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
