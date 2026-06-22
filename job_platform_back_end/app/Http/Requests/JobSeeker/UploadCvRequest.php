<?php

namespace App\Http\Requests\JobSeeker;

use Illuminate\Foundation\Http\FormRequest;

class UploadCvRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isJobSeeker();
    }

    public function rules(): array
    {
        return [
            'title'      => ['required', 'string', 'max:200'],
            'file'       => ['nullable', 'file', 'mimes:pdf,doc,docx', 'max:5120'], // 5 MB
            'visibility' => ['nullable', 'in:public,upon_request,private'],
            'is_primary' => ['nullable', 'boolean'],
        ];
    }
}
