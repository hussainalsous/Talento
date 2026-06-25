<?php

namespace App\Http\Requests\JobSeeker;

use Illuminate\Foundation\Http\FormRequest;

class RegisterCvRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'google_drive_file_id' => ['required', 'string', 'max:191'],
            'file_name'            => ['required', 'string', 'max:255'],
        ];
    }
}
