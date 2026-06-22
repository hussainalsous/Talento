<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourseResource;
use App\Models\Course;
use App\Services\CourseRecommendationService;
use App\Services\RedisCacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    private const TTL_LISTING = 3600; // 1 hour — courses change rarely
    private const TTL_RECOMMENDED = 300; // 5 minutes per seeker

    public function __construct(
        private readonly CourseRecommendationService $recommendationService,
        private readonly RedisCacheService $cache,
    ) {}

    /**
     * GET /api/v1/courses
     * Public — all authenticated users can browse courses.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'search'   => $request->input('search'),
            'page'     => $request->input('page', 1),
            'per_page' => min((int) $request->input('per_page', 20), 50),
        ];

        $cacheKey = $this->cache->filterKey('public:courses', $filters);
        $cached   = $this->cache->get($cacheKey);

        if ($cached !== null) {
            return response()->json($cached);
        }

        $query = Course::query();

        if ($search = $request->input('search')) {
            $query->where('title', 'like', "%{$search}%")
                  ->orWhere('provider', 'like', "%{$search}%");
        }

        $courses = $query->paginate($filters['per_page']);

        $payload = [
            'success' => true,
            'data'    => CourseResource::collection($courses)->toArray($request),
            'meta'    => [
                'current_page' => $courses->currentPage(),
                'per_page'     => $courses->perPage(),
                'total'        => $courses->total(),
                'last_page'    => $courses->lastPage(),
            ],
        ];

        $this->cache->set($cacheKey, $payload, self::TTL_LISTING);

        return response()->json($payload);
    }

    /**
     * GET /api/v1/job-seeker/recommended-courses
     * Personalized courses based on skill gaps.
     */
    public function recommended(Request $request): JsonResponse
    {
        $limit    = (int) $request->input('limit', 10);
        $cacheKey = "recommended_courses:{$limit}";
        $cached   = $this->cache->get($cacheKey);

        if ($cached !== null) {
            return response()->json(['success' => true, 'data' => $cached]);
        }

        $courses = $this->recommendationService->recommend($limit);

        $serialised = CourseResource::collection($courses)->toArray($request);

        $this->cache->set($cacheKey, $serialised, self::TTL_RECOMMENDED);

        return response()->json(['success' => true, 'data' => $serialised]);
    }
}
