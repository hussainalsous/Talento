<?php

namespace App\Http\Controllers\Api\V1\JobSeeker;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobSeeker\UpdateCvRequest;
use App\Http\Requests\JobSeeker\UploadCvRequest;
use App\Http\Resources\CvResource;
use App\Models\CV;
use App\Services\CvAnalysisService;
use App\Services\JobSeekerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CvController extends Controller
{
    public function __construct(
        private readonly JobSeekerService $jobSeekerService,
        private readonly CvAnalysisService $cvAnalysisService,
    ) {}

    /**
     * GET /api/v1/job-seeker/cvs
     */
    public function index(Request $request): JsonResponse
    {
        $jobSeeker = $this->jobSeekerService->getProfileForUser($request->user());
        $cvs       = $this->jobSeekerService->listCvs($jobSeeker);

        return response()->json([
            'success' => true,
            'data'    => CvResource::collection($cvs),
        ]);
    }

    /**
     * POST /api/v1/job-seeker/cvs
     */
    public function store(UploadCvRequest $request): JsonResponse
    {
        $jobSeeker = $this->jobSeekerService->getProfileForUser($request->user());
        $cv        = $this->jobSeekerService->uploadCv(
            $jobSeeker,
            $request->validated(),
            $request->file('file')
        );

        return response()->json([
            'success' => true,
            'message' => 'CV uploaded.',
            'data'    => new CvResource($cv),
        ], 201);
    }

    /**
     * PATCH /api/v1/job-seeker/cvs/{cv}
     */
    public function update(UpdateCvRequest $request, CV $cv): JsonResponse
    {
        $this->authorize('update', $cv);

        $updated = $this->jobSeekerService->updateCv(
            $cv,
            $request->validated(),
            $request->file('file')
        );

        return response()->json([
            'success' => true,
            'message' => 'CV updated.',
            'data'    => new CvResource($updated),
        ]);
    }

    /**
     * DELETE /api/v1/job-seeker/cvs/{cv}
     */
    public function destroy(CV $cv): JsonResponse
    {
        $this->authorize('delete', $cv);

        $this->jobSeekerService->deleteCv($cv);

        return response()->json([
            'success' => true,
            'message' => 'CV deleted.',
        ]);
    }

    /**
     * POST /api/v1/job-seeker/cvs/{cv}/analyze
     * Stub — parses and stores structured data from the CV file.
     */
    public function analyze(CV $cv): JsonResponse
    {
        $this->authorize('analyze', $cv);

        $result = $this->cvAnalysisService->analyze($cv);

        return response()->json([
            'success' => true,
            'message' => 'CV analysis complete.',
            'data'    => new CvResource($cv->fresh()),
            'analysis' => $result,
        ]);
    }
}
