<?php

namespace App\Http\Requests\JobSeeker;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCvRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isJobSeeker();
    }

    public function rules(): array
    {
        return [
            'title'      => ['sometimes', 'string', 'max:200'],
            'file'       => ['sometimes', 'nullable', 'file', 'mimes:pdf,doc,docx', 'max:5120'],
            'visibility' => ['sometimes', 'in:public,upon_request,private'],
            'is_primary' => ['sometimes', 'boolean'],
        ];
    }
}
