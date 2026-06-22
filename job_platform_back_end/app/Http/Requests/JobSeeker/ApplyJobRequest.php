<?php

namespace App\Http\Requests\JobSeeker;

use Illuminate\Foundation\Http\FormRequest;

class ApplyJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isJobSeeker();
    }

    public function rules(): array
    {
        return [
            'cv_id'        => ['nullable', 'exists:cvs,id'],
            'cover_letter' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
