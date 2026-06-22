<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ManageSubscriptionRequest;
use App\Http\Resources\PlanResource;
use App\Http\Resources\SubscriptionResource;
use App\Models\Company;
use App\Services\AdminService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function __construct(private readonly AdminService $adminService) {}

    /**
     * GET /api/v1/admin/plans
     */
    public function plans(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => PlanResource::collection($this->adminService->listPlans()),
        ]);
    }

    /**
     * GET /api/v1/admin/subscriptions
     */
    public function index(Request $request): JsonResponse
    {
        $subscriptions = $this->adminService->listSubscriptions(
            $request->only(['status', 'company_id', 'per_page'])
        );

        return response()->json([
            'success' => true,
            'data'    => SubscriptionResource::collection($subscriptions),
            'meta'    => [
                'current_page' => $subscriptions->currentPage(),
                'per_page'     => $subscriptions->perPage(),
                'total'        => $subscriptions->total(),
                'last_page'    => $subscriptions->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/v1/admin/companies/{company}/subscriptions
     */
    public function assign(ManageSubscriptionRequest $request, Company $company): JsonResponse
    {
        $subscription = $this->adminService->assignSubscription($company, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Subscription assigned.',
            'data'    => new SubscriptionResource($subscription->load('plan', 'company')),
        ], 201);
    }
}
