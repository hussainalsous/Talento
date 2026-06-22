<?php

namespace App\Models;

use App\Notifications\VerifyEmailNotification;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'email',
        'google_drive_file_id',
        'phone',
        'password',
        'role',
        'is_active',
        'last_login_at',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at'     => 'datetime',
            'password'          => 'hashed',
            'is_active'         => 'boolean',
        ];
    }

    /**
     * Send the email verification notification via our branded, queued notification
     * instead of Laravel's default VerifyEmail notification.
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification());
    }

    // -------------------------------------------------------------------------
    // Role helpers
    // -------------------------------------------------------------------------

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isCompanyOwner(): bool
    {
        return $this->role === 'company_owner';
    }

    public function isCompanyMember(): bool
    {
        return in_array($this->role, ['company_owner', 'company_member'], true);
    }

    public function isJobSeeker(): bool
    {
        return $this->role === 'job_seeker';
    }

    public function hasRole(string|array $roles): bool
    {
        return in_array($this->role, (array) $roles, true);
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function admin(): HasOne
    {
        return $this->hasOne(Admin::class);
    }

    public function jobSeeker(): HasOne
    {
        return $this->hasOne(JobSeeker::class);
    }

    public function companyMember(): HasOne
    {
        return $this->hasOne(CompanyMember::class);
    }

    // Company owned directly (for company_owner role)
    public function ownedCompany(): HasOne
    {
        return $this->hasOne(Company::class, 'owner_user_id');
    }
}
