<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreResumeChunkRequest;
use App\Http\Requests\StoreResumeEmbeddingRequest;
use App\Models\ResumeChunk;
use App\Models\ResumeEmbeddingMeta;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Throwable;

class ResumeChunkController extends Controller
{
    /**
     * Store (or update) a single CV chunk produced by the n8n workflow.
     *
     * Idempotent on the [candidate_id, chunk_type] pair so re-runs of the
     * workflow overwrite rather than duplicate.
     */
    public function storeChunk(StoreResumeChunkRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();

            ResumeChunk::updateOrCreate(
                [
                    'candidate_id' => $data['candidate_id'],
                    'chunk_type'   => $data['chunk_type'],
                ],
                [
                    'content'      => $data['content'],
                    'char_count'   => $data['char_count'],
                    'validated_at' => $data['validated_at'] ?? null,
                ],
            );

            return response()->json([
                'ok'         => true,
                'message'    => 'Chunk stored',
                'chunk_type' => $data['chunk_type'],
            ]);
        } catch (Throwable $e) {
            Log::error('[resume_chunk] storeChunk failed', ['exception' => $e]);

            return response()->json([
                'ok'    => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store (or update) embedding metadata for a single CV chunk.
     *
     * Idempotent on the [candidate_id, chunk_type] pair.
     */
    public function storeEmbedding(StoreResumeEmbeddingRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();

            $record = ResumeEmbeddingMeta::updateOrCreate(
                [
                    'candidate_id' => $data['candidate_id'],
                    'chunk_type'   => $data['chunk_type'],
                ],
                [
                    'model'             => $data['model'],
                    'dimensions'        => $data['dimensions'],
                    'char_count'        => $data['char_count'],
                    'embedded_at'       => $data['embedded_at'] ?? null,
                    'qdrant_collection' => $data['qdrant_collection'] ?? 'talento_cv_embeddings',
                    'qdrant_point_id'   => $data['qdrant_point_id'] ?? null,
                ],
            );

            return response()->json([
                'ok'                => true,
                'message'           => 'Embedding metadata stored',
                'chunk_type'        => $data['chunk_type'],
                'qdrant_point_id'   => $record->qdrant_point_id,
                'qdrant_collection' => $record->qdrant_collection,
            ]);
        } catch (Throwable $e) {
            Log::error('[resume_embedding] storeEmbedding failed', ['exception' => $e]);

            return response()->json([
                'ok'    => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
