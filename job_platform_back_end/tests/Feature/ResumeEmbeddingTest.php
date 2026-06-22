<?php

namespace Tests\Feature;

use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResumeEmbeddingTest extends TestCase
{
    /**
     * Authenticate as an arbitrary user — the embedding endpoint only requires
     * a valid Sanctum token, not a specific role.
     */
    private function authenticate(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['*']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'candidate_id' => '1AbCdEfGhIjKlMnOpQrStUvWxYz',
            'chunk_type'   => 'experience',
            'model'        => 'mistralai/mistral-embed-2312',
            'dimensions'   => 1024,
            'char_count'   => 512,
            'embedded_at'  => '2026-06-20T10:05:00Z',
        ], $overrides);
    }

    public function test_store_embedding_succeeds_with_valid_data(): void
    {
        $this->authenticate();

        $response = $this->postJson('/api/v1/resumes/embeddings', $this->validPayload());

        $response->assertStatus(200)
                 ->assertJson([
                     'ok'         => true,
                     'message'    => 'Embedding metadata stored',
                     'chunk_type' => 'experience',
                 ]);

        $this->assertDatabaseHas('resume_embedding_meta', [
            'candidate_id' => '1AbCdEfGhIjKlMnOpQrStUvWxYz',
            'chunk_type'   => 'experience',
            'model'        => 'mistralai/mistral-embed-2312',
            'dimensions'   => 1024,
        ]);
    }

    public function test_store_embedding_fails_without_required_fields(): void
    {
        $this->authenticate();

        $response = $this->postJson('/api/v1/resumes/embeddings', []);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors([
                     'candidate_id',
                     'chunk_type',
                     'model',
                     'dimensions',
                     'char_count',
                 ]);
    }

    public function test_store_embedding_is_idempotent(): void
    {
        $this->authenticate();

        $this->postJson('/api/v1/resumes/embeddings', $this->validPayload([
            'dimensions' => 1024,
        ]))->assertStatus(200);

        $this->postJson('/api/v1/resumes/embeddings', $this->validPayload([
            'dimensions' => 768,
            'model'      => 'mistralai/mistral-embed-v2',
        ]))->assertStatus(200);

        $this->assertDatabaseCount('resume_embedding_meta', 1);
        $this->assertDatabaseHas('resume_embedding_meta', [
            'candidate_id' => '1AbCdEfGhIjKlMnOpQrStUvWxYz',
            'chunk_type'   => 'experience',
            'dimensions'   => 768,
            'model'        => 'mistralai/mistral-embed-v2',
        ]);
    }

    public function test_store_embedding_does_not_store_vector_in_database(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/resumes/embeddings', [
            'candidate_id' => 'drive_file_123',
            'chunk_type'   => 'skills',
            'model'        => 'mistralai/mistral-embed-2312',
            'dimensions'   => 1024,
            'char_count'   => 200,
            'embedding'    => array_fill(0, 1024, 0.1), // simulate n8n sending vector
        ]);

        $response->assertStatus(200);

        // The raw vector must NOT be persisted: the table has no 'embedding' column.
        $this->assertFalse(
            \Illuminate\Support\Facades\Schema::hasColumn('resume_embedding_meta', 'embedding'),
            'resume_embedding_meta must not store the raw embedding vector.'
        );

        // ...but the metadata row itself is stored.
        $this->assertDatabaseHas('resume_embedding_meta', [
            'candidate_id' => 'drive_file_123',
            'chunk_type'   => 'skills',
        ]);

        // Confirm no 'embedding' column exists in the record
        $record = \App\Models\ResumeEmbeddingMeta::where('candidate_id', 'drive_file_123')->first();
        $this->assertFalse(isset($record->embedding));
    }
}
