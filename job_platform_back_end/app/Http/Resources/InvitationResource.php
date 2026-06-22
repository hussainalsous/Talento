<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvitationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'message'      => $this->message,
            'status'       => $this->status,
            'sent_at'      => $this->sent_at->toISOString(),
            'responded_at' => $this->responded_at?->toISOString(),
            'created_at'   => $this->created_at->toISOString(),

            'company'    => $this->whenLoaded('company', fn () => new CompanyResource($this->company)),
            'job_seeker' => $this->whenLoaded('jobSeeker', fn () => new JobSeekerResource($this->jobSeeker)),
            'job_post'   => $this->whenLoaded('jobPost', fn () => $this->jobPost ? new JobPostResource($this->jobPost) : null),
            'invited_by' => $this->whenLoaded('invitedBy', fn () => new UserResource($this->invitedBy)),
        ];
    }
}
