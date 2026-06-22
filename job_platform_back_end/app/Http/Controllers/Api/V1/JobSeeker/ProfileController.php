<?php

namespace App\Http\Controllers\Api\V1\JobSeeker;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobSeeker\UpdatePrivacyRequest;
use App\Http\Requests\JobSeeker\UpdateProfileRequest;
use App\Http\Resources\JobSeekerResource;
use App\Services\JobSeekerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(private readonly JobSeekerService $jobSeekerService) {}

    /**
     * GET /api/v1/job-seeker/profile
     */
    public function show(Request $request): JsonResponse
    {
        $jobSeeker = $this->jobSeekerService->getProfileForUser($request->user());
        $jobSeeker->load(['primaryCv', 'user']);

        return response()->json([
            'success' => true,
            'data'    => new JobSeekerResource($jobSeeker),
        ]);
    }

    /**
     * PATCH /api/v1/job-seeker/profile
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $jobSeeker = $this->jobSeekerService->getProfileForUser($request->user());
        $updated   = $this->jobSeekerService->updateProfile($jobSeeker, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Profile updated.',
            'data'    => new JobSeekerResource($updated->load(['user'])),
        ]);
    }

    /**
     * PATCH /api/v1/job-seeker/privacy
     */
    public function updatePrivacy(UpdatePrivacyRequest $request): JsonResponse
    {
        $jobSeeker = $this->jobSeekerService->getProfileForUser($request->user());
        $updated   = $this->jobSeekerService->updatePrivacy($jobSeeker, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Privacy settings updated.',
            'data'    => [
                'profile_visibility' => $updated->profile_visibility,
                'cv_visibility'      => $updated->cv_visibility,
                'open_to_work'       => $updated->open_to_work,
            ],
        ]);
    }

}
