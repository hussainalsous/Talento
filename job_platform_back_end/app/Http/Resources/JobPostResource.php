<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobPostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'company_id'      => $this->company_id,
            'title'           => $this->title,
            'description'     => $this->description,
            'location'        => $this->location,
            'employment_type' => $this->employment_type,
            'salary_min'      => $this->salary_min,
            'salary_max'      => $this->salary_max,
            'salary_range'    => $this->salary_min && $this->salary_max
                ? "{$this->salary_min} – {$this->salary_max}"
                : null,
            'responsibilities' => $this->responsibilities ?? [],
            'requirements'     => $this->requirements ?? [],
            'experience_years' => $this->experience_years,
            'level'            => $this->level,
            'job_type'         => $this->job_type,
            'status'           => $this->status,
            'expires_at'       => $this->expires_at?->toISOString(),
            'created_at'       => $this->created_at->toISOString(),
            'updated_at'       => $this->updated_at->toISOString(),

            // Loaded relations
            'company'    => $this->whenLoaded('company', fn () => new CompanyResource($this->company)),
            'created_by' => $this->whenLoaded('createdBy', fn () => new UserResource($this->createdBy)),

            // Statistics — only available when explicitly appended
            'applications_count' => $this->when(
                isset($this->applications_count),
                $this->applications_count
            ),
        ];
    }
}
