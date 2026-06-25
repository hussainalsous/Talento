<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobEmbedMeta extends Model
{
    protected $table = 'job_embed_meta';

    protected $fillable = [
        'job_post_id',
        'model',
        'dimensions',
        'char_count',
        'embedded_text',
        'qdrant_collection',
        'qdrant_point_id',
        'status',
        'embedded_at',
    ];

    protected function casts(): array
    {
        return [
            'embedded_at' => 'datetime',
            'dimensions'  => 'integer',
            'char_count'  => 'integer',
        ];
    }

    public function jobPost(): BelongsTo
    {
        return $this->belongsTo(JobPost::class);
    }

    public function isEmbedded(): bool
    {
        return $this->status === 'embedded';
    }
}
