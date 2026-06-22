<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResumeEmbeddingMeta extends Model
{
    protected $table = 'resume_embedding_meta';

    protected $fillable = [
        'candidate_id',
        'chunk_type',
        'model',
        'dimensions',
        'char_count',
        'embedded_at',
        'qdrant_collection',
        'qdrant_point_id',
    ];

    protected $casts = [
        'embedded_at' => 'datetime',
        'dimensions'  => 'integer',
        'char_count'  => 'integer',
    ];

    /**
     * Returns the Qdrant point ID for frontend semantic search queries.
     */
    public function qdrantPointId(): ?string
    {
        return $this->qdrant_point_id;
    }
}
