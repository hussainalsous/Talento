<?php

namespace App\Http\Controllers\Api\V1\JobSeeker;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobSeeker\ApplyJobRequest;
use App\Http\Resources\JobApplicationResource;
use App\Models\JobApplication;
use App\Models\JobPost;
use App\Services\JobSeekerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    public function __construct(private readonly JobSeekerService $jobSeekerService) {}

    /**
     * POST /api/v1/job-posts/{jobPost}/apply
     */
    public function apply(ApplyJobRequest $request, JobPost $jobPost): JsonResponse
    {
        $jobSeeker   = $this->jobSeekerService->getProfileForUser($request->user());
        $application = $this->jobSeekerService->applyToJob($jobSeeker, $jobPost, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Application submitted.',
            'data'    => new JobApplicationResource($application->load('jobPost.company')),
        ], 201);
    }

    /**
     * GET /api/v1/job-seeker/applications
     */
    public function index(Request $request): JsonResponse
    {
        $jobSeeker    = $this->jobSeekerService->getProfileForUser($request->user());
        $applications = $this->jobSeekerService->listApplications(
            $jobSeeker,
            $request->only(['status', 'per_page'])
        );

        return response()->json([
            'success' => true,
            'data'    => JobApplicationResource::collection($applications),
            'meta'    => [
                'current_page' => $applications->currentPage(),
                'per_page'     => $applications->perPage(),
                'total'        => $applications->total(),
                'last_page'    => $applications->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/v1/job-seeker/applications/{jobApplication}
     */
    public function show(JobApplication $jobApplication): JsonResponse
    {
        $this->authorize('view', $jobApplication);

        return response()->json([
            'success' => true,
            'data'    => new JobApplicationResource(
                $jobApplication->load('jobPost.company', 'cv')
            ),
        ]);
    }

    /**
     * PATCH /api/v1/job-seeker/applications/{jobApplication}/withdraw
     */
    public function withdraw(JobApplication $jobApplication): JsonResponse
    {
        $this->authorize('withdraw', $jobApplication);

        $updated = $this->jobSeekerService->withdrawApplication($jobApplication);

        return response()->json([
            'success' => true,
            'message' => 'Application withdrawn.',
            'data'    => new JobApplicationResource($updated),
        ]);
    }
}
