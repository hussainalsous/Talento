<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class JobSeeker extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'professional_title',
        'open_to_work',
        'current_job',
        'location',
        'preferred_job_type',
        'desired_salary',
        'profile_visibility',
        'cv_visibility',
        'last_updated_at',
    ];

    protected function casts(): array
    {
        return [
            'desired_salary'  => 'decimal:2',
            'last_updated_at' => 'datetime',
            'open_to_work'    => 'boolean',
        ];
    }

    // -------------------------------------------------------------------------
    // Privacy helpers
    // -------------------------------------------------------------------------

    public function isProfileVisibleTo(User $viewer): bool
    {
        if ($this->profile_visibility === 'public') {
            return true;
        }
        if ($this->profile_visibility === 'private') {
            return $viewer->id === $this->user_id || $viewer->isAdmin();
        }
        // 'limited': visible to companies and admins, not anonymous
        return $viewer->isCompanyMember() || $viewer->isAdmin();
    }

    public function isCvDirectlyAccessibleTo(User $viewer): bool
    {
        if ($this->cv_visibility === 'public') {
            return true;
        }
        return $viewer->id === $this->user_id || $viewer->isAdmin();
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cvs(): HasMany
    {
        return $this->hasMany(CV::class);
    }

    public function primaryCv(): HasOne
    {
        return $this->hasOne(CV::class)->where('is_primary', true)->latestOfMany();
    }

    public function jobApplications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(Invitation::class);
    }
}
