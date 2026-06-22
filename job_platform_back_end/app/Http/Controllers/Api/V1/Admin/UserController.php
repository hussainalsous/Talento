<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateSystemEmployeeRequest;
use App\Http\Requests\Admin\UpdatePermissionsRequest;
use App\Http\Resources\AdminResource;
use App\Http\Resources\UserResource;
use App\Models\Admin;
use App\Models\User;
use App\Services\AdminService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private readonly AdminService $adminService) {}

    /**
     * GET /api/v1/admin/users
     */
    public function index(Request $request): JsonResponse
    {
        $users = $this->adminService->listUsers($request->only([
            'role', 'search', 'is_active', 'per_page',
        ]));

        return response()->json([
            'success' => true,
            'data'    => UserResource::collection($users),
            'meta'    => [
                'current_page' => $users->currentPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
                'last_page'    => $users->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/v1/admin/users/{user}
     */
    public function show(User $user): JsonResponse
    {
        $user->load([
            'admin',
            'jobSeeker.skills',
            'companyMember.company',
        ]);

        return response()->json([
            'success' => true,
            'data'    => new UserResource($user),
        ]);
    }

    /**
     * PATCH /api/v1/admin/users/{user}/activate
     */
    public function activate(User $user): JsonResponse
    {
        $this->adminService->activateUser($user);

        return response()->json([
            'success' => true,
            'message' => 'User activated.',
            'data'    => new UserResource($user->fresh()),
        ]);
    }

    /**
     * PATCH /api/v1/admin/users/{user}/deactivate
     */
    public function deactivate(User $user): JsonResponse
    {
        $this->adminService->deactivateUser($user);

        return response()->json([
            'success' => true,
            'message' => 'User deactivated and sessions revoked.',
            'data'    => new UserResource($user->fresh()),
        ]);
    }

    /**
     * POST /api/v1/admin/system-employees
     */
    public function createSystemEmployee(CreateSystemEmployeeRequest $request): JsonResponse
    {
        $result = $this->adminService->createSystemEmployee($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'System employee created.',
            'data'    => new UserResource($result['user']->load('admin')),
        ], 201);
    }

    /**
     * PATCH /api/v1/admin/system-employees/{admin}/permissions
     */
    public function updatePermissions(UpdatePermissionsRequest $request, Admin $admin): JsonResponse
    {
        $updatedAdmin = $this->adminService->updateAdminPermissions(
            $admin,
            $request->input('permissions')
        );

        return response()->json([
            'success' => true,
            'message' => 'Permissions updated.',
            'data'    => new AdminResource($updatedAdmin),
        ]);
    }
}
