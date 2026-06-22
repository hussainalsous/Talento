<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'title'       => ['sometimes', 'string', 'max:255'],
            'category'    => ['sometimes', 'string', 'max:100'],
            'provider'    => ['sometimes', 'nullable', 'string', 'max:255'],
            'language'    => ['sometimes', 'string', 'max:100'],
            'price'       => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'link'        => ['sometimes', 'nullable', 'url', 'max:500'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'duration'    => ['sometimes', 'string', 'max:100'],
            'teacher'     => ['sometimes', 'nullable', 'string', 'max:255'],
            'course_image_url'    => ['sometimes', 'nullable', 'url', 'max:500'],
            'level'               => ['sometimes', 'in:beginner,intermediate,advanced'],
            'learning_material'   => ['sometimes', 'nullable', 'array'],
            'learning_material.*' => ['string', 'max:500'],
        ];
    }
}
