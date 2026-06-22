<?php

namespace App\Http\Requests\Company;

use App\Models\JobApplication;
use Illuminate\Foundation\Http\FormRequest;

class UpdateApplicationStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isCompanyMember();
    }

    public function rules(): array
    {
        return [
            'status' => [
                'required',
                'in:' . implode(',', JobApplication::COMPANY_ALLOWED_STATUSES),
            ],
            'score' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
        ];
    }
}
