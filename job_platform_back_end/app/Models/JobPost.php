<?php

namespace App\Models;

use App\Events\JobPostPublished;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class JobPost extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_id',
        'created_by',
        'title',
        'description',
        'location',
        'employment_type',
        'salary_min',
        'salary_max',
        'responsibilities',
        'requirements',
        'experience_years',
        'level',
        'job_type',
        'status',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'salary_min'       => 'decimal:2',
            'salary_max'       => 'decimal:2',
            'expires_at'       => 'datetime',
            'responsibilities' => 'array',
            'requirements'     => 'array',
        ];
    }

    // -------------------------------------------------------------------------
    // Model events
    // -------------------------------------------------------------------------

    /**
     * Fire JobPostPublished after a job post transitions into the "published"
     * status. Uses the `updated` event (fired post-save) with wasChanged() so the
     * event only dispatches once the new status has actually been persisted.
     */
    protected static function booted(): void
    {
        // Transitioned into published via an update (draft → published).
        // Create-as-published is dispatched from CompanyService::createJobPost so
        // model-level creation (factories, seeders) doesn't trigger the pipeline.
        static::updated(function (self $job): void {
            $wasPublished = $job->wasChanged('status')
                && $job->status === 'published'
                && $job->getOriginal('status') !== 'published';

            if ($wasPublished) {
                event(new JobPostPublished($job));
            }
        });
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopePublished($query)
    {
        return $query->where('status', 'published')
            ->where(fn($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }

    public function scopeEmbedded($query)
    {
        return $query->whereHas('embedMeta', fn($q) => $q->where('status', 'embedded'));
    }

    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(Invitation::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function embedMeta(): HasOne
    {
        return $this->hasOne(JobEmbedMeta::class);
    }

    public function matches(): HasMany
    {
        return $this->hasMany(JobCandidateMatch::class);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Build the text representation of this job post that gets embedded.
     *
     * `responsibilities` and `requirements` are stored as JSON arrays, so each is
     * flattened to a newline-separated block. Empty sections are dropped and the
     * remaining sections are joined with a blank line.
     */
    public function embeddableText(): string
    {
        $sections = [
            $this->title,
            $this->description,
            $this->flattenSection($this->requirements),
            $this->flattenSection($this->responsibilities),
        ];

        return collect($sections)
            ->filter(fn($section) => filled($section))
            ->implode("\n\n");
    }

    /**
     * Normalise a section that may be a JSON array or a plain string into text.
     */
    private function flattenSection(mixed $section): string
    {
        if (is_array($section)) {
            return collect($section)
                ->filter(fn($line) => filled($line))
                ->implode("\n");
        }

        return (string) $section;
    }

    public function isPublished(): bool
    {
        return $this->status === 'published'
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }

    public function isEmbedded(): bool
    {
        return $this->embedMeta()->where('status', 'embedded')->exists();
    }
}
