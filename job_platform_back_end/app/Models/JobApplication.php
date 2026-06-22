<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_post_id',
        'job_seeker_id',
        'cv_id',
        'cover_letter',
        'status',
        'score',
        'applied_at',
    ];

    protected function casts(): array
    {
        return [
            'applied_at' => 'datetime',
            'score'      => 'integer',
        ];
    }

    // -------------------------------------------------------------------------
    // Status constants
    // -------------------------------------------------------------------------

    const STATUS_SUBMITTED    = 'submitted';
    const STATUS_UNDER_REVIEW = 'under_review';
    const STATUS_SHORTLISTED  = 'shortlisted';
    const STATUS_REJECTED     = 'rejected';
    const STATUS_ACCEPTED     = 'accepted';
    const STATUS_WITHDRAWN    = 'withdrawn';

    // Statuses that a company member can transition to
    const COMPANY_ALLOWED_STATUSES = [
        self::STATUS_UNDER_REVIEW,
        self::STATUS_SHORTLISTED,
        self::STATUS_REJECTED,
        self::STATUS_ACCEPTED,
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function jobPost(): BelongsTo
    {
        return $this->belongsTo(JobPost::class);
    }

    public function jobSeeker(): BelongsTo
    {
        return $this->belongsTo(JobSeeker::class);
    }

    public function cv(): BelongsTo
    {
        return $this->belongsTo(CV::class);
    }
}
