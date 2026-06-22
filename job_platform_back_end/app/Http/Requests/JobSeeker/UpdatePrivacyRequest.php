<?php

namespace App\Http\Requests\JobSeeker;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePrivacyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isJobSeeker();
    }

    public function rules(): array
    {
        return [
            'profile_visibility' => ['sometimes', 'in:public,limited,private'],
            'cv_visibility'      => ['sometimes', 'in:public,upon_request,private'],
            'open_to_work'       => ['sometimes', 'boolean'],
        ];
    }
}
