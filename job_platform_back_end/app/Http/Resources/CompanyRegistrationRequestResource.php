<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CompanyRegistrationRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'company_name'         => $this->company_name,
            'registration_number'  => $this->registration_number,
            'website'              => $this->website,
            'address'              => $this->address,
            'country'              => $this->country,
            'description'          => $this->description,
            'logo_url'             => $this->logo_path
                ? Storage::disk('public')->url($this->logo_path)
                : null,
            'requester_first_name' => $this->requester_first_name,
            'requester_last_name'  => $this->requester_last_name,
            'requester_email'      => $this->requester_email,
            'requester_phone'      => $this->requester_phone,
            'status'               => $this->status,
            'email_verified_at'    => $this->email_verified_at?->toISOString(),
            'rejection_reason'     => $this->rejection_reason,
            'reviewed_at'          => $this->reviewed_at?->toISOString(),
            'company_id'           => $this->company_id,
            'created_at'           => $this->created_at->toISOString(),

            'reviewed_by' => $this->whenLoaded('reviewedBy', fn () => new AdminResource($this->reviewedBy)),
        ];
    }
}
