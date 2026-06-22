<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobPostResource;
use App\Models\JobPost;
use App\Services\RedisCacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public job post listing — available to all users (authenticated or not).
 */
class JobPostController extends Controller
{
    private const TTL = 300; // 5 minutes

    public function __construct(private readonly RedisCacheService $cache) {}

    /**
     * GET /api/v1/job-posts
     * Filters: search, location, employment_type, skill_ids, salary_min, salary_max, sort, dir
     */
    public function index(Request $request): JsonResponse
    {
        $filters = array_merge(
            $request->only(['search', 'location', 'employment_type', 'salary_min', 'salary_max', 'sort', 'dir']),
            [
                'page'     => $request->input('page', 1),
                'per_page' => min((int) $request->input('per_page', 15), 50),
            ]
        );

        $cacheKey = $this->cache->filterKey('public:job_posts', $filters);

        $cached = $this->cache->get($cacheKey);

        if ($cached !== null) {
            return response()->json($cached);
        }

        $query = JobPost::published()->with(['company']);

        if ($search = $request->input('search')) {
            $query->where(fn ($q) => $q
                ->where('title', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%")
            );
        }

        if ($location = $request->input('location')) {
            $query->where('location', 'like', "%{$location}%");
        }

        if ($type = $request->input('employment_type')) {
            $query->where('employment_type', $type);
        }

        if ($salaryMin = $request->input('salary_min')) {
            $query->where(fn ($q) => $q->whereNull('salary_max')->orWhere('salary_max', '>=', $salaryMin));
        }

        if ($salaryMax = $request->input('salary_max')) {
            $query->where(fn ($q) => $q->whereNull('salary_min')->orWhere('salary_min', '<=', $salaryMax));
        }

        $allowedSorts = ['created_at', 'salary_min', 'salary_max', 'expires_at'];
        $sort = in_array($request->input('sort'), $allowedSorts) ? $request->input('sort') : 'created_at';
        $dir  = $request->input('dir') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sort, $dir);

        $jobPosts = $query->paginate($filters['per_page']);

        $payload = [
            'success' => true,
            'data'    => JobPostResource::collection($jobPosts)->toArray($request),
            'meta'    => [
                'current_page' => $jobPosts->currentPage(),
                'per_page'     => $jobPosts->perPage(),
                'total'        => $jobPosts->total(),
                'last_page'    => $jobPosts->lastPage(),
            ],
        ];

        $this->cache->set($cacheKey, $payload, self::TTL);

        return response()->json($payload);
    }

    /**
     * GET /api/v1/job-posts/{jobPost}
     */
    public function show(JobPost $jobPost): JsonResponse
    {
        abort_unless($jobPost->status === 'published', 404);

        $jobPost->load(['company']);

        return response()->json([
            'success' => true,
            'data'    => new JobPostResource($jobPost),
        ]);
    }
}
