<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResumeChunk extends Model
{
    protected $table = 'resume_chunks';

    protected $fillable = [
        'candidate_id',
        'chunk_type',
        'content',
        'char_count',
        'validated_at',
    ];

    protected $casts = [
        'validated_at' => 'datetime',
        'char_count'   => 'integer',
    ];
}
