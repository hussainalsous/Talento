<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CompanyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'name'                => $this->name,
            'registration_number' => $this->registration_number,
            'website'             => $this->website,
            'address'             => $this->address,
            'country'             => $this->country,
            'description'         => $this->description,
            'logo_url'            => $this->logo_path
                ? Storage::disk('public')->url($this->logo_path)
                : null,
            'approval_status'     => $this->approval_status,
            'approved_at'         => $this->approved_at?->toISOString(),
            'created_at'          => $this->created_at->toISOString(),

            // Conditionally loaded
            'owner'   => $this->whenLoaded('owner', fn () => new UserResource($this->owner)),
            'members' => $this->whenLoaded('members', fn () => CompanyMemberResource::collection($this->members)),
            'active_subscription' => $this->whenLoaded(
                'activeSubscription',
                fn () => $this->activeSubscription
                    ? new SubscriptionResource($this->activeSubscription)
                    : null
            ),
        ];
    }
}
