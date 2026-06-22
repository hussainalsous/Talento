<?php

namespace App\Http\Requests\JobSeeker;

use Illuminate\Foundation\Http\FormRequest;

class RespondInvitationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isJobSeeker();
    }

    public function rules(): array
    {
        return [
            'action' => ['required', 'in:accept,decline'],
        ];
    }
}
