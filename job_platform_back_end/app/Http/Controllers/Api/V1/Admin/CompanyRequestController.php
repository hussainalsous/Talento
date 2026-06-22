<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReviewCompanyRequestRequest;
use App\Http\Resources\CompanyRegistrationRequestResource;
use App\Http\Resources\CompanyResource;
use App\Models\CompanyRegistrationRequest;
use App\Services\AdminService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyRequestController extends Controller
{
    public function __construct(private readonly AdminService $adminService) {}

    /**
     * GET /api/v1/admin/company-registration-requests
     * Paginated DB query, results cached per filter+page in AdminService.
     */
    public function index(Request $request): JsonResponse
    {
        $requests = $this->adminService->listRegistrationRequests(
            $request->only(['status', 'search', 'per_page'])
        );

        return response()->json([
            'success' => true,
            'data'    => CompanyRegistrationRequestResource::collection($requests),
            'meta'    => [
                'current_page' => $requests->currentPage(),
                'per_page'     => $requests->perPage(),
                'total'        => $requests->total(),
                'last_page'    => $requests->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/v1/admin/redis/company-registration-requests
     * Alias of index() — delegates to the same cached service method.
     * Kept for backwards-compatibility with existing client calls.
     */
    public function redisIndex(Request $request): JsonResponse
    {
        $requests = $this->adminService->listRegistrationRequests(
            $request->only(['status', 'search', 'per_page'])
        );

        return response()->json([
            'success' => true,
            'data'    => CompanyRegistrationRequestResource::collection($requests),
            'meta'    => [
                'current_page' => $requests->currentPage(),
                'per_page'     => $requests->perPage(),
                'total'        => $requests->total(),
                'last_page'    => $requests->lastPage(),
            ],
            'cached' => true,
        ]);
    }

    /**
     * GET /api/v1/admin/company-registration-requests/{companyRegistrationRequest}
     */
    public function show(CompanyRegistrationRequest $companyRegistrationRequest): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => new CompanyRegistrationRequestResource($companyRegistrationRequest),
        ]);
    }

    /**
     * PATCH /api/v1/admin/company-registration-requests/{companyRegistrationRequest}/approve
     */
    public function approve(
        CompanyRegistrationRequest $companyRegistrationRequest
    ): JsonResponse {
        ['company' => $company] = $this->adminService->approveRegistrationRequest(
            $companyRegistrationRequest,
            request()->user()
        );

        return response()->json([
            'success' => true,
            'message' => 'Company registration approved. Account created.',
            'data'    => new CompanyResource($company->load('owner')),
        ]);
    }

    /**
     * PATCH /api/v1/admin/company-registration-requests/{companyRegistrationRequest}/reject
     */
    public function reject(
        ReviewCompanyRequestRequest $request,
        CompanyRegistrationRequest $companyRegistrationRequest
    ): JsonResponse {
        $updated = $this->adminService->rejectRegistrationRequest(
            $companyRegistrationRequest,
            $request->user(),
            $request->input('rejection_reason')
        );

        return response()->json([
            'success' => true,
            'message' => 'Company registration rejected.',
            'data'    => new CompanyRegistrationRequestResource($updated),
        ]);
    }
}
