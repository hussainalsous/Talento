<?php

namespace App\Http\Controllers\Api\V1\JobSeeker;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobPostResource;
use App\Services\JobMatchingService;
use App\Services\JobSeekerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchingController extends Controller
{
    public function __construct(
        private readonly JobMatchingService $matchingService,
        private readonly JobSeekerService $jobSeekerService,
    ) {}

    /**
     * GET /api/v1/job-seeker/suitable-jobs
     * Returns published job posts ranked by match with the seeker's profile.
     */
    public function suitableJobs(Request $request): JsonResponse
    {
        $jobSeeker = $this->jobSeekerService->getProfileForUser($request->user());

        $jobs = $this->matchingService->suitableJobs(
            $jobSeeker,
            $request->only(['search', 'location', 'employment_type', 'per_page'])
        );

        return response()->json([
            'success' => true,
            'data'    => JobPostResource::collection($jobs),
            'meta'    => [
                'current_page' => $jobs->currentPage(),
                'per_page'     => $jobs->perPage(),
                'total'        => $jobs->total(),
                'last_page'    => $jobs->lastPage(),
            ],
        ]);
    }
}
