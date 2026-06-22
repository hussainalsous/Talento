<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobCandidateMatch extends Model
{
    protected $table = 'job_candidate_matches';

    /** Score at or above which a candidate is automatically shortlisted. */
    public const SCORE_AUTO_SHORTLIST = 0.80;

    /** Score at or above which a candidate is surfaced as a suggestion. */
    public const SCORE_SUGGEST = 0.60;

    protected $fillable = [
        'job_post_id',
        'candidate_id',
        'match_score',
        'score_breakdown',
        'status',
        'matched_by',
        'matched_at',
        'notified_at',
    ];

    protected function casts(): array
    {
        return [
            'match_score'     => 'decimal:4',
            'score_breakdown' => 'array',
            'matched_at'      => 'datetime',
            'notified_at'     => 'datetime',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function jobPost(): BelongsTo
    {
        return $this->belongsTo(JobPost::class);
    }

    public function candidate(): BelongsTo
    {
        return $this->belongsTo(User::class, 'candidate_id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeVisible($query)
    {
        return $query->where('match_score', '>=', self::SCORE_SUGGEST);
    }

    public function scopeAutoShortlisted($query)
    {
        return $query->where('match_score', '>=', self::SCORE_AUTO_SHORTLIST);
    }

    public function scopeForJob($query, int $jobPostId)
    {
        return $query->where('job_post_id', $jobPostId);
    }

    public function scopeForCandidate($query, int $candidateId)
    {
        return $query->where('candidate_id', $candidateId);
    }

    public function scopeOrderByScore($query)
    {
        return $query->orderByDesc('match_score');
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Classify this match by score band.
     *
     * @return string  'auto_shortlisted' | 'suggested' | 'hidden'
     */
    public function tier(): string
    {
        return match (true) {
            $this->match_score >= self::SCORE_AUTO_SHORTLIST => 'auto_shortlisted',
            $this->match_score >= self::SCORE_SUGGEST        => 'suggested',
            default                                          => 'hidden',
        };
    }
}
