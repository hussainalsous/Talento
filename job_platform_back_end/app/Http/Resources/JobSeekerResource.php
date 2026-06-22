<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobSeekerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $isOwner = $viewer && $viewer->id === $this->user_id;
        $isAdmin = $viewer && $viewer->isAdmin();
        $isCompany = $viewer && $viewer->isCompanyMember();

        // Respect profile_visibility
        $canSeeFull  = $isOwner || $isAdmin;
        $isLimited   = ! $canSeeFull && $isCompany && $this->profile_visibility === 'limited';
        $canSeeBasic = $canSeeFull || ($isCompany && $this->profile_visibility !== 'private');

        if (! $canSeeBasic) {
            return [
                'id'         => $this->id,
                'first_name' => $this->first_name,
                'last_name'  => substr($this->last_name, 0, 1) . '.',
                'location'   => $this->location,
                'visibility' => 'private',
            ];
        }

        // Limited profiles mask the last name for company viewers
        $lastName = $isLimited
            ? strtoupper(substr($this->last_name, 0, 1)) . '.'
            : $this->last_name;

        return array_filter([
            'id'                  => $this->id,
            'user_id'             => $this->user_id,
            'first_name'          => $this->first_name,
            'last_name'           => $lastName,
            'full_name'           => "{$this->first_name} {$lastName}",
            'professional_title'  => $this->professional_title,
            'open_to_work'        => $this->open_to_work,
            'current_job'         => $this->current_job,
            'location'            => $this->location,
            'preferred_job_type'  => $this->preferred_job_type,
            'desired_salary'      => $this->desired_salary,
            'profile_visibility'  => $this->whenNotNull($this->profile_visibility),
            'cv_visibility'       => $this->when($isOwner || $isAdmin, $this->cv_visibility),
            'last_updated_at'     => $this->last_updated_at?->toISOString(),
            'created_at'          => $this->created_at->toISOString(),

            'primary_cv'       => $this->whenLoaded('primaryCv', fn () => $this->primaryCv ? new CvResource($this->primaryCv) : null),
            'user'             => $this->whenLoaded('user', fn () => new UserResource($this->user)),
        ], fn($v) => $v !== null);
    }
}
