<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\UpdateCompanyProfileRequest;
use App\Http\Requests\Company\UploadLogoRequest;
use App\Http\Resources\CompanyResource;
use App\Services\CompanyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(private readonly CompanyService $companyService) {}

    /**
     * GET /api/v1/company/profile
     */
    public function show(Request $request): JsonResponse
    {
        $company = $this->companyService->getCompanyForUser($request->user());
        $this->authorize('view', $company);

        $company->load(['owner', 'activeSubscription.plan']);

        return response()->json([
            'success' => true,
            'data'    => new CompanyResource($company),
        ]);
    }

    /**
     * PATCH /api/v1/company/profile
     */
    public function update(UpdateCompanyProfileRequest $request): JsonResponse
    {
        $company = $this->companyService->getCompanyForUser($request->user());
        $this->authorize('update', $company);

        $updated = $this->companyService->updateProfile($company, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Company profile updated.',
            'data'    => new CompanyResource($updated),
        ]);
    }

    /**
     * POST /api/v1/company/logo
     */
    public function uploadLogo(UploadLogoRequest $request): JsonResponse
    {
        $company = $this->companyService->getCompanyForUser($request->user());
        $this->authorize('update', $company);

        $updated = $this->companyService->uploadLogo($company, $request->file('logo'));

        return response()->json([
            'success' => true,
            'message' => 'Logo uploaded.',
            'data'    => new CompanyResource($updated),
        ]);
    }
}
