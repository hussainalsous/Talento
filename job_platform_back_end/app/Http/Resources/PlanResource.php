<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'description'   => $this->description,
            'price'         => $this->price,
            'billing_cycle' => $this->billing_cycle,
            'max_job_posts' => $this->max_job_posts,
            'max_members'   => $this->max_members,
            'is_active'     => $this->is_active,
        ];
    }
}
