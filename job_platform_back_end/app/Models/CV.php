<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CV extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'cvs';

    protected $fillable = [
        'job_seeker_id',
        'title',
        'file_path',
        'parsed_data',
        'is_primary',
        'visibility',
    ];

    protected function casts(): array
    {
        return [
            'parsed_data' => 'array',
            'is_primary'  => 'boolean',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function jobSeeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class);
    }

    public function jobApplications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }
}
