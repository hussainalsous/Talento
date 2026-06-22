<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'user_id'         => $this->user_id,
            'company_id'      => $this->company_id,
            'first_name'      => $this->first_name,
            'last_name'       => $this->last_name,
            'full_name'       => "{$this->first_name} {$this->last_name}",
            'role_in_company' => $this->role_in_company,
            'created_at'      => $this->created_at->toISOString(),

            'user'    => $this->whenLoaded('user', fn () => new UserResource($this->user)),
            'company' => $this->whenLoaded('company', fn () => new CompanyResource($this->company)),
        ];
    }
}
