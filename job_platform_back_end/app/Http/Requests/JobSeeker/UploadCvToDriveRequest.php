<?php

namespace App\Http\Requests\JobSeeker;

use Illuminate\Foundation\Http\FormRequest;

class UploadCvToDriveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cv'    => ['required', 'file', 'mimes:pdf', 'max:10240'], // 10 MB
            'title' => ['nullable', 'string', 'max:200'],
        ];
    }
}
