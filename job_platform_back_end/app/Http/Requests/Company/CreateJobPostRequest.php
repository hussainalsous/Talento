<?php

namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateJobPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isCompanyMember();
    }

    public function rules(): array
    {
        return [
            'title'       => ['required', 'string', 'max:200'],
            'description'     => ['required', 'string'],
            'location'        => ['nullable', 'string', 'max:200'],
            'employment_type' => [
                'required',
                'in:full_time,part_time,remote,contract,internship,freelance',
            ],
            'salary_min'       => ['nullable', 'numeric', 'min:0'],
            'salary_max'       => ['nullable', 'numeric', Rule::when(
                fn () => $this->filled('salary_min'),
                ['gte:salary_min'],
            )],
            'responsibilities'   => ['required', 'array'],
            'responsibilities.*' => ['string'],
            'requirements'       => ['required', 'array'],
            'requirements.*'     => ['string'],
            'experience_years'   => ['nullable', 'integer', 'min:0'],
            'level'              => ['nullable', 'in:Fresh graduate,Junior,Mid-level,Senior'],
            'job_type'           => ['nullable', 'in:Full-time,Part-time,Contract,Remotely,Internship'],
            'status'             => ['nullable', 'in:draft,published,closed,archived'],
            'expires_at' => ['nullable', 'date', 'after:today'],
        ];
    }
}
