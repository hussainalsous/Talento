<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class CompanyRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Company info
            'company_name'        => ['required', 'string', 'max:200'],
            'registration_number' => [
                'required', 'string', 'max:100',
                'unique:company_registration_requests,registration_number',
                'unique:companies,registration_number',
            ],
            'website'             => ['nullable', 'url', 'max:255'],
            'address'             => ['nullable', 'string', 'max:500'],
            'country'             => ['nullable', 'string', 'max:100'],
            'description'         => ['nullable', 'string', 'max:3000'],
            'logo'                => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            // Requester (future owner)
            'requester_first_name' => ['required', 'string', 'max:100'],
            'requester_last_name'  => ['required', 'string', 'max:100'],
            'requester_email'      => [
                'required', 'email', 'max:255',
                'unique:users,email',
                'unique:company_registration_requests,requester_email',
            ],
            'requester_phone'      => ['nullable', 'string', 'max:30'],
            'password'             => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }
}
