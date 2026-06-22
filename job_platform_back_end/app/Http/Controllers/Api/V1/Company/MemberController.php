<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\CreateMemberRequest;
use App\Http\Requests\Company\UpdateMemberRequest;
use App\Http\Resources\CompanyMemberResource;
use App\Models\CompanyMember;
use App\Services\CompanyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemberController extends Controller
{
    public function __construct(private readonly CompanyService $companyService) {}

    /**
     * GET /api/v1/company/members
     */
    public function index(Request $request): JsonResponse
    {
        $company = $this->companyService->getCompanyForUser($request->user());
        $this->authorize('view', $company);

        $members = $this->companyService->listMembers($company);

        return response()->json([
            'success' => true,
            'data'    => CompanyMemberResource::collection($members),
        ]);
    }

    /**
     * POST /api/v1/company/members
     */
    public function store(CreateMemberRequest $request): JsonResponse
    {
        $company = $this->companyService->getCompanyForUser($request->user());
        $this->authorize('manageMembers', $company);

        $member = $this->companyService->addMember($company, $request->validated(), $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Member added.',
            'data'    => new CompanyMemberResource($member->load('user')),
        ], 201);
    }

    /**
     * PATCH /api/v1/company/members/{companyMember}
     */
    public function update(UpdateMemberRequest $request, CompanyMember $companyMember): JsonResponse
    {
        $company = $this->companyService->getCompanyForUser($request->user());
        $this->authorize('manageMembers', $company);

        // Ensure the member belongs to this company
        abort_unless($companyMember->company_id === $company->id, 403, 'Forbidden.');

        $updated = $this->companyService->updateMember($companyMember, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Member updated.',
            'data'    => new CompanyMemberResource($updated),
        ]);
    }

    /**
     * DELETE /api/v1/company/members/{companyMember}
     */
    public function destroy(Request $request, CompanyMember $companyMember): JsonResponse
    {
        $company = $this->companyService->getCompanyForUser($request->user());
        $this->authorize('manageMembers', $company);

        abort_unless($companyMember->company_id === $company->id, 403, 'Forbidden.');
        abort_if($companyMember->user_id === $request->user()->id, 422, 'Cannot remove yourself.');

        $this->companyService->removeMember($companyMember);

        return response()->json([
            'success' => true,
            'message' => 'Member removed.',
        ]);
    }
}
