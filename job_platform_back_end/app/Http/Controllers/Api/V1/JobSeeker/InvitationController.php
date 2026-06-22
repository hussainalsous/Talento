<?php

namespace App\Http\Controllers\Api\V1\JobSeeker;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobSeeker\RespondInvitationRequest;
use App\Http\Resources\InvitationResource;
use App\Models\Invitation;
use App\Services\InvitationService;
use App\Services\JobSeekerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvitationController extends Controller
{
    public function __construct(
        private readonly InvitationService $invitationService,
        private readonly JobSeekerService $jobSeekerService,
    ) {}

    /**
     * GET /api/v1/job-seeker/invitations
     */
    public function index(Request $request): JsonResponse
    {
        $jobSeeker   = $this->jobSeekerService->getProfileForUser($request->user());
        $invitations = $this->invitationService->listForJobSeeker(
            $jobSeeker,
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
     * PATCH /api/v1/job-seeker/invitations/{invitation}/respond
     */
    public function respond(RespondInvitationRequest $request, Invitation $invitation): JsonResponse
    {
        $this->authorize('respond', $invitation);

        // Map action verb to status noun: accept → accepted, decline → declined
        $status  = $request->input('action') === 'accept' ? 'accepted' : 'declined';
        $updated = $this->invitationService->respondToInvitation($invitation, $status);

        return response()->json([
            'success' => true,
            'message' => 'Invitation response recorded.',
            'data'    => new InvitationResource($updated->load('company', 'jobPost')),
        ]);
    }
}
