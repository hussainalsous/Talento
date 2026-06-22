<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreResumeChunkRequest extends FormRequest
{
    /**
     * Access is gated by the auth:sanctum middleware on the route; any
     * authenticated caller (the n8n service token) is allowed through.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'candidate_id' => ['required', 'string', 'max:255'],
            'chunk_type'   => ['required', 'string', 'in:skills,education,experience,additional_information'],
            'content'      => ['required', 'string'],
            'char_count'   => ['required', 'integer', 'min:1'],
            'validated_at' => ['nullable', 'string'],
        ];
    }
}
