<?php

namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;

class CreateMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole(['admin', 'company_owner']);
    }

    public function rules(): array
    {
        return [
            'first_name'      => ['required', 'string', 'max:100'],
            'last_name'       => ['required', 'string', 'max:100'],
            'email'           => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone'           => ['nullable', 'string', 'max:30'],
            'password'        => ['required', 'string', 'min:8'],
            'role_in_company' => ['nullable', 'string', 'max:100'],
        ];
    }
}
