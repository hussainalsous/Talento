<?php

namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateJobPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isCompanyMember();
    }

    public function rules(): array
    {
        return [
            'title'       => ['sometimes', 'string', 'max:200'],
            'description'     => ['sometimes', 'string'],
            'location'        => ['sometimes', 'nullable', 'string', 'max:200'],
            'employment_type' => [
                'sometimes',
                'in:full_time,part_time,remote,contract,internship,freelance',
            ],
            'salary_min'       => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'salary_max'       => ['sometimes', 'nullable', 'numeric', Rule::when(
                fn () => $this->filled('salary_min'),
                ['gte:salary_min'],
            )],
            'responsibilities'   => ['sometimes', 'array'],
            'responsibilities.*' => ['string'],
            'requirements'       => ['sometimes', 'array'],
            'requirements.*'     => ['string'],
            'experience_years'   => ['sometimes', 'nullable', 'integer', 'min:0'],
            'level'              => ['sometimes', 'nullable', 'in:Fresh graduate,Junior,Mid-level,Senior'],
            'job_type'           => ['sometimes', 'nullable', 'in:Full-time,Part-time,Contract,Remotely,Internship'],
            'status'             => ['sometimes', 'in:draft,published,closed,archived'],
            'expires_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
