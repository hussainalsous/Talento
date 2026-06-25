<?php

namespace App\Http\Controllers\Api\V1\JobSeeker;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobSeeker\RegisterCvRequest;
use App\Http\Requests\JobSeeker\UpdateCvRequest;
use App\Http\Requests\JobSeeker\UploadCvRequest;
use App\Http\Requests\JobSeeker\UploadCvToDriveRequest;
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
     * POST /api/v1/resumes/upload
     *
     * Flutter sends the PDF binary; Laravel uploads it to Google Drive, records
     * the mapping, and triggers the n8n cv-ingest webhook.
     */
    public function upload(UploadCvToDriveRequest $request): JsonResponse
    {
        $result = $this->jobSeekerService->uploadCvToDrive(
            $request->user(),
            $request->file('cv'),
            $request->input('title'),
        );

        return response()->json([
            'success' => true,
            'message' => 'CV uploaded and processing triggered.',
            'data'    => $result,
        ]);
    }

    /**
     * POST /api/v1/resumes/register-cv
     *
     * Called by the Flutter app after the CV is uploaded to Google Drive.
     * Saves the Drive file ID on the user and triggers the n8n CV matching pipeline.
     */
    public function registerCv(RegisterCvRequest $request): JsonResponse
    {
        $this->jobSeekerService->registerCv($request->user(), $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'CV registered and matching triggered.',
        ]);
    }

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
