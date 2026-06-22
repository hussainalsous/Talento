<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\CompanyRegistrationRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\JobSeekerRegisterRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Resources\CompanyRegistrationRequestResource;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    /**
     * POST /api/v1/auth/job-seeker/register
     */
    public function registerJobSeeker(JobSeekerRegisterRequest $request): JsonResponse
    {
        $result = $this->authService->registerJobSeeker($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Registration successful.',
            'data'    => [
                'user'  => new UserResource($result['user']->load('jobSeeker')),
                'token' => $result['token'],
            ],
        ], 201);
    }

    /**
     * POST /api/v1/auth/company-registration-requests
     * Public — submits a request for admin review (no user account created yet).
     */
    public function submitCompanyRegistration(CompanyRegistrationRequest $request): JsonResponse
    {
        $logoPath = null;
        
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('company-logos', 'public');
        }

        $registrationRequest = $this->authService->submitCompanyRegistrationRequest(
            $request->validated(),
            $logoPath
        );

        return response()->json([
            'success' => true,
            'message' => 'Company registration request submitted. Pending admin review.',
            'data'    => new CompanyRegistrationRequestResource($registrationRequest),
        ], 201);
    }

    /**
     * POST /api/v1/auth/login
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login(
            $request->input('email'),
            $request->input('password'),
            $request->ip(),
        );

        $user = $result['user'];

        // Load the appropriate profile based on role
        match ($user->role) {
            'admin'                     => $user->load('admin'),
            'company_owner'             => $user->load('companyMember.company'),
            'company_member'            => $user->load('companyMember.company'),
            'job_seeker'                => $user->load('jobSeeker'),
            default                     => null,
        };

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data'    => [
                'user'  => new UserResource($user),
                'token' => $result['token'],
            ],
        ]);
    }

    /**
     * POST /api/v1/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * GET /api/v1/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        match ($user->role) {
            'admin'          => $user->load('admin'),
            'company_owner'  => $user->load('companyMember.company'),
            'company_member' => $user->load('companyMember.company'),
            'job_seeker'     => $user->load('jobSeeker.skills'),
            default          => null,
        };

        return response()->json([
            'success' => true,
            'data'    => new UserResource($user),
        ]);
    }

    /**
     * PATCH /api/v1/auth/password
     */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $this->authService->updatePassword($request->user(), $request->input('password'));

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully.',
        ]);
    }

    /**
     * POST /api/v1/auth/forgot-password
     * Public — emails a reset link. Always returns a generic success message so
     * the endpoint cannot be used to discover which emails are registered.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $this->authService->sendPasswordResetLink($request->input('email'));

        return response()->json([
            'success' => true,
            'message' => 'If an account exists for that email, a password reset link has been sent.',
        ]);
    }

    /**
     * POST /api/v1/auth/reset-password
     * Public — validates the reset token and sets the new password.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $this->authService->resetPassword(
            $request->only('email', 'password', 'password_confirmation', 'token')
        );

        return response()->json([
            'success' => true,
            'message' => 'Password has been reset successfully. You can now log in with your new password.',
        ]);
    }
}
