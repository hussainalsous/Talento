<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\CreateJobPostRequest;
use App\Http\Requests\Company\UpdateApplicationStatusRequest;
use App\Http\Requests\Company\UpdateJobPostRequest;
use App\Http\Resources\JobApplicationResource;
use App\Http\Resources\JobPostResource;
use App\Models\JobApplication;
use App\Models\JobPost;
use App\Services\CompanyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobPostController extends Controller
{
    public function __construct(private readonly CompanyService $companyService) {}

    /**
     * GET /api/v1/company/job-posts
     */
    public function index(Request $request): JsonResponse
    {
        $company  = $this->companyService->getCompanyForUser($request->user());
        $jobPosts = $this->companyService->listCompanyJobPosts(
            $company,
            $request->only(['status', 'per_page'])
        );

        return response()->json([
            'success' => true,
            'data'    => JobPostResource::collection($jobPosts),
            'meta'    => [
                'current_page' => $jobPosts->currentPage(),
                'per_page'     => $jobPosts->perPage(),
                'total'        => $jobPosts->total(),
                'last_page'    => $jobPosts->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/v1/company/job-posts
     */
    public function store(CreateJobPostRequest $request): JsonResponse
    {
        $company = $this->companyService->getCompanyForUser($request->user());
        $this->authorize('createJobPost', $company);

        $jobPost = $this->companyService->createJobPost(
            $company,
            $request->user(),
            $request->validated()
        );

        return response()->json([
            'success' => true,
            'message' => 'Job post created.',
            'data'    => new JobPostResource($jobPost),
        ], 201);
    }

    /**
     * GET /api/v1/company/job-posts/{jobPost}
     */
    public function show(JobPost $jobPost): JsonResponse
    {
        $this->authorize('view', $jobPost);

        return response()->json([
            'success' => true,
            'data'    => new JobPostResource($jobPost->load('skills')),
        ]);
    }

    /**
     * PATCH /api/v1/company/job-posts/{jobPost}
     */
    public function update(UpdateJobPostRequest $request, JobPost $jobPost): JsonResponse
    {
        $this->authorize('update', $jobPost);

        $updated = $this->companyService->updateJobPost($jobPost, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Job post updated.',
            'data'    => new JobPostResource($updated),
        ]);
    }

    /**
     * DELETE /api/v1/company/job-posts/{jobPost}
     */
    public function destroy(JobPost $jobPost): JsonResponse
    {
        $this->authorize('delete', $jobPost);

        $this->companyService->deleteJobPost($jobPost);

        return response()->json([
            'success' => true,
            'message' => 'Job post deleted.',
        ]);
    }

    /**
     * GET /api/v1/company/job-posts/{jobPost}/applicants
     */
    public function applicants(Request $request, JobPost $jobPost): JsonResponse
    {
        $this->authorize('viewApplicants', $jobPost);

        $applications = $this->companyService->listApplicants(
            $jobPost,
            $request->only(['status', 'sort', 'dir', 'per_page'])
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
     * PATCH /api/v1/company/applications/{jobApplication}/status
     */
    public function updateApplicationStatus(
        UpdateApplicationStatusRequest $request,
        JobApplication $jobApplication
    ): JsonResponse {
        $this->authorize('updateStatus', $jobApplication);

        $updated = $this->companyService->updateApplicationStatus(
            $jobApplication,
            $request->input('status'),
            $request->input('score')
        );

        return response()->json([
            'success' => true,
            'message' => 'Application status updated.',
            'data'    => new JobApplicationResource($updated->load('jobSeeker', 'jobPost')),
        ]);
    }
}
