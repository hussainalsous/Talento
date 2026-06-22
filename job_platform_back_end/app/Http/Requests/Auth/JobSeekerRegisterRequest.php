<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class JobSeekerRegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name'       => ['required', 'string', 'max:100'],
            'last_name'        => ['required', 'string', 'max:100'],
            'email'            => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone'            => ['nullable', 'string', 'max:30'],
            'password'         => ['required', 'string', 'min:8', 'confirmed'],
            'location'         => ['nullable', 'string', 'max:200'],
            'preferred_job_type' => [
                'nullable',
                'string',
                'in:full_time,part_time,remote,contract,internship,freelance',
            ],
        ];
    }
}
