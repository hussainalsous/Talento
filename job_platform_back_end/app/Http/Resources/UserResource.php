<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'email'             => $this->email,
            'phone'             => $this->phone,
            'role'              => $this->role,
            'is_active'         => $this->is_active,
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'last_login_at'     => $this->last_login_at?->toISOString(),
            'created_at'        => $this->created_at->toISOString(),

            // Role-specific profiles — only included when loaded
            'admin'          => $this->whenLoaded('admin', fn () => new AdminResource($this->admin)),
            'job_seeker'     => $this->whenLoaded('jobSeeker', fn () => new JobSeekerResource($this->jobSeeker)),
            'company_member' => $this->whenLoaded('companyMember', fn () => new CompanyMemberResource($this->companyMember)),
        ];
    }
}
