<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'title'             => $this->title,
            'category'          => $this->category,
            'provider'          => $this->provider,
            'language'          => $this->language,
            'price'             => $this->price,
            'link'              => $this->link,
            'description'       => $this->description,
            'duration'          => $this->duration,
            'teacher'           => $this->teacher,
            'course_image_url'  => $this->course_image_url,
            'level'             => $this->level,
            'learning_material' => $this->learning_material ?? [],
            'created_at'        => $this->created_at->toISOString(),

            // Included when recommendation service adds a reason
            'recommendation_reason' => $this->when(
                isset($this->recommendation_reason),
                $this->recommendation_reason ?? null
            ),
        ];
    }
}
