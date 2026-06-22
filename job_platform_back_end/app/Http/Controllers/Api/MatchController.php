<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobCandidateMatch;
use App\Models\JobPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchController extends Controller
{
    /**
     * GET /api/jobs/{jobPost}/matches
     *
     * List candidate matches for a job post (company view). Filterable by minimum
     * score and status. Any "new" matches returned are flipped to "viewed".
     */
    public function index(Request $request, JobPost $jobPost): JsonResponse
    {
        $this->authorize('view', $jobPost);

        $validated = $request->validate([
            'min_score' => ['nullable', 'numeric', 'between:0,1'],
            'status'    => ['nullable', 'string', 'in:new,viewed,shortlisted,auto_shortlisted,rejected'],
            'per_page'  => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $minScore = $validated['min_score'] ?? JobCandidateMatch::SCORE_SUGGEST;
        $perPage  = $validated['per_page'] ?? 20;

        // The users table has no `name` column — candidate names live on the
        // job_seekers profile, so eager-load that for display.
        $query = $jobPost->matches()
            ->where('match_score', '>=', $minScore)
            ->with([
                'candidate:id,email,google_drive_file_id',
                'candidate.jobSeeker:user_id,first_name,last_name',
            ])
            ->orderByScore();

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $matches = $query->paginate($perPage);

        // Mark freshly surfaced matches as viewed.
        JobCandidateMatch::whereIn('id', $matches->pluck('id'))
            ->where('status', 'new')
            ->update(['status' => 'viewed']);

        return response()->json([
            'success' => true,
            'data'    => $matches->items(),
            'meta'    => [
                'current_page' => $matches->currentPage(),
                'per_page'     => $matches->perPage(),
                'total'        => $matches->total(),
                'last_page'    => $matches->lastPage(),
            ],
        ]);
    }

    /**
     * PUT /api/jobs/{jobPost}/matches/{match}
     *
     * Update the recruiter-facing status of a single match.
     */
    public function updateStatus(Request $request, JobPost $jobPost, JobCandidateMatch $match): JsonResponse
    {
        $this->authorize('update', $jobPost);

        abort_if($match->job_post_id !== $jobPost->id, 404, 'Match not found for this job post.');

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:shortlisted,rejected,new'],
        ]);

        $match->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'data'    => $match->fresh(),
        ]);
    }

    /**
     * GET /api/candidate/matches
     *
     * List the authenticated candidate's own job matches (visible tier only).
     */
    public function candidateMatches(Request $request): JsonResponse
    {
        $user = $request->user();

        $perPage = (int) $request->integer('per_page', 20);
        $perPage = max(1, min(100, $perPage));

        $matches = JobCandidateMatch::query()
            ->forCandidate($user->id)
            ->visible()
            ->orderByScore()
            ->with([
                'jobPost:id,title,description,location,employment_type,salary_min,salary_max,company_id',
                'jobPost.company:id,name,logo_path',
            ])
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $matches->items(),
            'meta'    => [
                'current_page' => $matches->currentPage(),
                'per_page'     => $matches->perPage(),
                'total'        => $matches->total(),
                'last_page'    => $matches->lastPage(),
            ],
        ]);
    }
}
