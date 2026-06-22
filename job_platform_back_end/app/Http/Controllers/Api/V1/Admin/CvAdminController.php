<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CvResource;
use App\Models\CV;
use App\Services\AdminService;
use Illuminate\Http\JsonResponse;

class CvAdminController extends Controller
{
    public function __construct(private readonly AdminService $adminService) {}

    /**
     * GET /api/v1/admin/cvs/{cv}
     * Admin can view any CV regardless of visibility setting.
     */
    public function show(CV $cv): JsonResponse
    {
        $cv->load('jobSeeker');

        return response()->json([
            'success' => true,
            'data'    => new CvResource($cv),
        ]);
    }

    /**
     * DELETE /api/v1/admin/cvs/{cv}
     * Admin can delete any inappropriate CV permanently.
     */
    public function destroy(CV $cv): JsonResponse
    {
        $this->adminService->deleteCV($cv);

        return response()->json([
            'success' => true,
            'message' => 'CV permanently deleted.',
        ]);
    }
}
