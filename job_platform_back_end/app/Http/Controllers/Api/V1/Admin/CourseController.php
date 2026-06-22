<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCourseRequest;
use App\Http\Requests\Admin\UpdateCourseRequest;
use App\Http\Resources\CourseResource;
use App\Models\Course;
use App\Services\RedisCacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CourseController extends Controller
{
    private const TTL = 120;

    public function __construct(private readonly RedisCacheService $cache) {}

    public function index(Request $request): JsonResponse
    {
        $filters = [
            'search'   => $request->input('search'),
            'category' => $request->input('category'),
            'page'     => $request->input('page', 1),
            'per_page' => (int) $request->input('per_page', 15),
        ];

        $key    = $this->cache->filterKey('admin:courses', $filters);
        $cached = $this->cache->get($key);

        if ($cached !== null) {
            Log::debug('[REDIS] HIT admin:courses');
            return response()->json($cached);
        }

        $courses = Course::query()
            ->when($filters['search'], fn ($q, $s) => $q->where('title', 'like', "%{$s}%")
                ->orWhere('provider', 'like', "%{$s}%")
                ->orWhere('description', 'like', "%{$s}%")
                ->orWhere('category', 'like', "%{$s}%"))
            ->when($filters['category'], fn ($q, $c) => $q->where('category', $c))
            ->latest()
            ->paginate($filters['per_page']);

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

        $this->cache->set($key, $payload, self::TTL);
        Log::debug('[REDIS] MISS admin:courses');

        return response()->json($payload);
    }

    public function store(StoreCourseRequest $request): JsonResponse
    {
        $course = Course::create($request->validated());

        $this->cache->delPattern('public:courses:*');
        $this->cache->delPattern('admin:courses:*');
        Log::debug('[REDIS] INVALIDATE admin:courses:* public:courses:*');

        return response()->json([
            'success' => true,
            'message' => 'Course created successfully.',
            'data'    => new CourseResource($course),
        ], 201);
    }

    public function show(Course $course): CourseResource
    {
        return new CourseResource($course);
    }

    public function update(UpdateCourseRequest $request, Course $course): JsonResponse
    {
        $course->update($request->validated());

        $this->cache->delPattern('public:courses:*');
        $this->cache->delPattern('admin:courses:*');
        Log::debug('[REDIS] INVALIDATE admin:courses:* public:courses:*');

        return response()->json([
            'success' => true,
            'message' => 'Course updated successfully.',
            'data'    => new CourseResource($course->fresh()),
        ]);
    }

    public function destroy(Course $course): JsonResponse
    {
        $course->delete();

        $this->cache->delPattern('public:courses:*');
        $this->cache->delPattern('admin:courses:*');
        Log::debug('[REDIS] INVALIDATE admin:courses:* public:courses:*');

        return response()->json(['success' => true, 'message' => 'Course deleted successfully.']);
    }
}
