<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreResumeEmbeddingRequest extends FormRequest
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
            'model'        => ['required', 'string', 'max:255'],
            'dimensions'   => ['required', 'integer'],
            'char_count'   => ['required', 'integer', 'min:1'],
            'embedded_at'  => ['nullable', 'string'],
            'qdrant_collection' => 'nullable|string|max:255',
            'qdrant_point_id'   => 'nullable|string|max:255',
        ];
    }
}
