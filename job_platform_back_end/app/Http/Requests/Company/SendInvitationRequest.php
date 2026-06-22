<?php

namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;

class SendInvitationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isCompanyMember();
    }

    public function rules(): array
    {
        return [
            'job_seeker_id' => ['required', 'exists:job_seekers,id'],
            'job_post_id'   => ['nullable', 'exists:job_posts,id'],
            'message'       => ['nullable', 'string', 'max:2000'],
        ];
    }
}
