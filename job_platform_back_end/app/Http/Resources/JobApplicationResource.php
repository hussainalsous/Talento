<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'status'       => $this->status,
            'score'        => $this->score,
            'cover_letter' => $this->cover_letter,
            'applied_at'   => $this->applied_at->toISOString(),
            'created_at'   => $this->created_at->toISOString(),
            'updated_at'   => $this->updated_at->toISOString(),

            'job_post'   => $this->whenLoaded('jobPost', fn () => new JobPostResource($this->jobPost)),
            'job_seeker' => $this->whenLoaded('jobSeeker', fn () => new JobSeekerResource($this->jobSeeker)),
            'cv'         => $this->whenLoaded('cv', fn () => $this->cv ? new CvResource($this->cv) : null),
        ];
    }
}
