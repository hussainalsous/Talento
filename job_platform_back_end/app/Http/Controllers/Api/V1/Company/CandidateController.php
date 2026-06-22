<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobSeekerResource;
use App\Models\JobSeeker;
use App\Services\CandidateSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CandidateController extends Controller
{
    public function __construct(private readonly CandidateSearchService $searchService) {}

    /**
     * GET /api/v1/company/candidates
     * Filter: search, location, preferred_job_type, skill_ids, salary_max, per_page
     */
    public function index(Request $request): JsonResponse
    {
        $candidates = $this->searchService->search(
            $request->only([
                'search', 'location', 'preferred_job_type', 'salary_max', 'per_page',
            ]),
            $request->user()
        );

        return response()->json([
            'success' => true,
            'data'    => JobSeekerResource::collection($candidates),
            'meta'    => [
                'current_page' => $candidates->currentPage(),
                'per_page'     => $candidates->perPage(),
                'total'        => $candidates->total(),
                'last_page'    => $candidates->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/v1/company/candidates/{jobSeeker}
     */
    public function show(Request $request, JobSeeker $jobSeeker): JsonResponse
    {
        $candidate = $this->searchService->getCandidate($jobSeeker, $request->user());

        if (! $candidate) {
            return response()->json([
                'success' => false,
                'message' => 'This candidate\'s profile is private.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data'    => new JobSeekerResource($candidate),
        ]);
    }

    /**
     * POST /api/v1/company/candidates/{jobSeeker}/request-cv-access
     * Sends an invitation when CV is set to upon_request.
     */
    public function requestCvAccess(Request $request, JobSeeker $jobSeeker): JsonResponse
    {
        // CV is upon_request — company must send an invitation for the seeker to share it
        if ($jobSeeker->cv_visibility === 'public') {
            return response()->json([
                'success' => false,
                'message' => 'CV is already publicly accessible.',
            ], 422);
        }

        if ($jobSeeker->cv_visibility === 'private') {
            return response()->json([
                'success' => false,
                'message' => 'This candidate has set their CV to private.',
            ], 403);
        }

        // Create an invitation as a CV access request
        $company = $request->user()->companyMember->company;

        $invitation = \App\Models\Invitation::create([
            'company_id'    => $company->id,
            'invited_by'    => $request->user()->id,
            'job_seeker_id' => $jobSeeker->id,
            'message'       => $request->input('message', 'We would like to view your CV.'),
            'status'        => 'pending',
            'sent_at'       => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'CV access request sent as invitation.',
            'data'    => new \App\Http\Resources\InvitationResource($invitation),
        ], 201);
    }
}
