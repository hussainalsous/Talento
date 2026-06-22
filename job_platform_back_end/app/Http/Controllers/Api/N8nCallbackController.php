<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobCandidateMatch;
use App\Models\JobEmbedMeta;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class N8nCallbackController extends Controller implements HasMiddleware
{
    /**
     * Guard every callback with the shared n8n webhook secret.
     *
     * @return array<int, Middleware|string>
     */
    public static function middleware(): array
    {
        return ['n8n.secret'];
    }

    /**
     * Callback fired by n8n once a job post's vector has been upserted into Qdrant.
     * Promotes the embedding-meta row to "embedded" and stores the Qdrant pointer.
     */
    public function jobEmbeddingDone(Request $request): JsonResponse
    {
        $data = $request->validate([
            'job_post_id'     => ['required', 'integer', 'exists:job_posts,id'],
            'qdrant_point_id' => ['required', 'string', 'max:255'],
            'model'           => ['required', 'string', 'max:255'],
            'dimensions'      => ['required', 'integer'],
            'char_count'      => ['required', 'integer', 'min:0'],
        ]);

        $meta = JobEmbedMeta::updateOrCreate(
            ['job_post_id' => $data['job_post_id']],
            [
                'qdrant_point_id' => $data['qdrant_point_id'],
                'model'           => $data['model'],
                'dimensions'      => $data['dimensions'],
                'char_count'      => $data['char_count'],
                'status'          => 'embedded',
                'embedded_at'     => now(),
            ],
        );

        return response()->json([
            'ok'              => true,
            'job_post_id'     => $meta->job_post_id,
            'qdrant_point_id' => $meta->qdrant_point_id,
        ]);
    }

    /**
     * Callback fired by n8n with the candidate matches for a job post.
     *
     * Incoming matches identify candidates by their Google Drive file ID (the
     * Qdrant candidate_id). These are resolved to internal user IDs; matches for
     * unknown candidates are skipped. Matches at or above the auto-shortlist
     * threshold are stored with the "auto_shortlisted" status.
     */
    public function matchDone(Request $request): JsonResponse
    {
        $data = $request->validate([
            'job_post_id'                  => ['required', 'integer', 'exists:job_posts,id'],
            'trigger'                      => ['required', 'string', 'in:cv_upload,job_publish,scheduled_rerank'],
            'matches'                      => ['required', 'array'],
            'matches.*.candidate_id'       => ['required', 'string'],
            'matches.*.match_score'        => ['required', 'numeric', 'between:0,1'],
            'matches.*.score_breakdown'    => ['nullable', 'array'],
        ]);

        $driveIds = collect($data['matches'])->pluck('candidate_id')->unique()->all();

        // Map Google Drive file ID => internal user id.
        $userIdsByDriveId = User::whereIn('google_drive_file_id', $driveIds)
            ->pluck('id', 'google_drive_file_id');

        $upserted = 0;
        $skipped  = 0;

        DB::transaction(function () use ($data, $userIdsByDriveId, &$upserted, &$skipped) {
            foreach ($data['matches'] as $match) {
                $userId = $userIdsByDriveId->get($match['candidate_id']);

                if ($userId === null) {
                    $skipped++;
                    continue;
                }

                $score  = (float) $match['match_score'];
                $status = $score >= JobCandidateMatch::SCORE_AUTO_SHORTLIST
                    ? 'auto_shortlisted'
                    : 'new';

                JobCandidateMatch::updateOrCreate(
                    [
                        'job_post_id'  => $data['job_post_id'],
                        'candidate_id' => $userId,
                    ],
                    [
                        'match_score'     => $score,
                        'score_breakdown' => $match['score_breakdown'] ?? null,
                        'status'          => $status,
                        'matched_by'      => $data['trigger'],
                        'matched_at'      => now(),
                    ],
                );

                $upserted++;
            }
        });

        return response()->json([
            'ok'       => true,
            'upserted' => $upserted,
            'skipped'  => $skipped,
        ]);
    }

    /**
     * Generic error sink for the n8n matching/embedding workflows. Logs the error
     * and, when a job post is involved, marks its pending embedding as failed.
     */
    public function logError(Request $request): JsonResponse
    {
        $data = $request->validate([
            'workflow'     => ['nullable', 'string'],
            'node'         => ['nullable', 'string'],
            'error'        => ['nullable', 'string'],
            'job_post_id'  => ['nullable', 'integer'],
            'candidate_id' => ['nullable', 'string'],
        ]);

        Log::error('[n8n] workflow error', $data);

        if (! empty($data['job_post_id'])) {
            JobEmbedMeta::where('job_post_id', $data['job_post_id'])
                ->where('status', 'pending')
                ->update(['status' => 'failed']);
        }

        return response()->json(['ok' => true]);
    }
}
