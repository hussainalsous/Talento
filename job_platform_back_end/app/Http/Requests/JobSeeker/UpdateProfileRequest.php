<?php

namespace App\Http\Requests\JobSeeker;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isJobSeeker();
    }

    public function rules(): array
    {
        return [
            'first_name'         => ['sometimes', 'string', 'max:100'],
            'last_name'          => ['sometimes', 'string', 'max:100'],
            'professional_title' => ['sometimes', 'nullable', 'string', 'max:200'],
            'open_to_work'       => ['sometimes', 'boolean'],
            'current_job'        => ['sometimes', 'nullable', 'string', 'max:200'],
            'location'           => ['sometimes', 'nullable', 'string', 'max:200'],
            'preferred_job_type' => [
                'sometimes', 'nullable',
                'in:full_time,part_time,remote,contract,internship,freelance',
            ],
            'desired_salary'     => ['sometimes', 'nullable', 'numeric', 'min:0'],
            // Phone update (updates user record)
            'phone'              => ['sometimes', 'nullable', 'string', 'max:30'],
        ];
    }
}
