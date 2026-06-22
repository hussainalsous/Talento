<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CvResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer    = $request->user();
        $jobSeeker = $this->jobSeeker ?? $this->whenLoaded('jobSeeker');
        $isOwner   = $viewer && $jobSeeker && $viewer->id === $jobSeeker->user_id;
        $isAdmin   = $viewer && $viewer->isAdmin();

        // Only owner and admin see parsed data
        $canSeeParsed = $isOwner || $isAdmin;

        return [
            'id'          => $this->id,
            'title'       => $this->title,
            'is_primary'  => $this->is_primary,
            'visibility'  => $this->visibility,
            'file_url'    => $this->file_path
                ? Storage::disk('public')->url($this->file_path)
                : null,
            'parsed_data' => $this->when($canSeeParsed, $this->parsed_data),
            'created_at'  => $this->created_at->toISOString(),
            'updated_at'  => $this->updated_at->toISOString(),
        ];
    }
}
