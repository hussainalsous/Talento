<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ReviewCompanyRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        // Used only by the /reject route — `action` field is no longer required
        // since the intent is already expressed by the URL.
        return [
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ];
    }
}
