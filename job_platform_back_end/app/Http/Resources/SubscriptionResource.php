<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'status'     => $this->status,
            'starts_at'  => $this->starts_at?->toISOString(),
            'ends_at'    => $this->ends_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),

            'plan'    => $this->whenLoaded('plan', fn () => new PlanResource($this->plan)),
            'company' => $this->whenLoaded('company', fn () => new CompanyResource($this->company)),
        ];
    }
}
