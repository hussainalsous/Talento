<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\SendInvitationRequest;
use App\Http\Resources\InvitationResource;
use App\Services\CompanyService;
use App\Services\InvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvitationController extends Controller
{
    public function __construct(
        private readonly InvitationService $invitationService,
        private readonly CompanyService $companyService,
    ) {}

    /**
     * GET /api/v1/company/invitations
     */
    public function index(Request $request): JsonResponse
    {
        $company     = $this->companyService->getCompanyForUser($request->user());
        $invitations = $this->invitationService->listForCompany(
            $company,
            $request->only(['status', 'per_page'])
        );

        return response()->json([
            'success' => true,
            'data'    => InvitationResource::collection($invitations),
            'meta'    => [
                'current_page' => $invitations->currentPage(),
                'per_page'     => $invitations->perPage(),
                'total'        => $invitations->total(),
                'last_page'    => $invitations->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/v1/company/invitations
     */
    public function store(SendInvitationRequest $request): JsonResponse
    {
        $company    = $this->companyService->getCompanyForUser($request->user());
        $invitation = $this->invitationService->sendInvitation(
            $company,
            $request->user(),
            $request->validated()
        );

        return response()->json([
            'success' => true,
            'message' => 'Invitation sent.',
            'data'    => new InvitationResource($invitation->load('jobSeeker.user', 'jobPost')),
        ], 201);
    }
}
