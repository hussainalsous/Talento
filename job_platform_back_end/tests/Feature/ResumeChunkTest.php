<?php

namespace Tests\Feature;

use App\Models\ResumeChunk;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResumeChunkTest extends TestCase
{
    /**
     * Authenticate as an arbitrary user — the chunk endpoints only require a
     * valid Sanctum token, not a specific role.
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
            'chunk_type'   => 'skills',
            'content'      => 'PHP, Laravel, MySQL, Redis, Qdrant',
            'char_count'   => 33,
            'validated_at' => '2026-06-20T10:00:00Z',
        ], $overrides);
    }

    public function test_store_chunk_succeeds_with_valid_data(): void
    {
        $this->authenticate();

        $response = $this->postJson('/api/v1/resumes/chunks', $this->validPayload());

        $response->assertStatus(200)
                 ->assertJson([
                     'ok'         => true,
                     'message'    => 'Chunk stored',
                     'chunk_type' => 'skills',
                 ]);

        $this->assertDatabaseHas('resume_chunks', [
            'candidate_id' => '1AbCdEfGhIjKlMnOpQrStUvWxYz',
            'chunk_type'   => 'skills',
            'char_count'   => 33,
        ]);
    }

    public function test_store_chunk_fails_without_candidate_id(): void
    {
        $this->authenticate();

        $response = $this->postJson('/api/v1/resumes/chunks', $this->validPayload([
            'candidate_id' => null,
        ]));

        $response->assertStatus(422)
                 ->assertJsonValidationErrors('candidate_id');
    }

    public function test_store_chunk_fails_with_invalid_chunk_type(): void
    {
        $this->authenticate();

        $response = $this->postJson('/api/v1/resumes/chunks', $this->validPayload([
            'chunk_type' => 'summary',
        ]));

        $response->assertStatus(422)
                 ->assertJsonValidationErrors('chunk_type');
    }

    public function test_store_chunk_is_idempotent(): void
    {
        $this->authenticate();

        $this->postJson('/api/v1/resumes/chunks', $this->validPayload([
            'content'    => 'first version',
            'char_count' => 13,
        ]))->assertStatus(200);

        $this->postJson('/api/v1/resumes/chunks', $this->validPayload([
            'content'    => 'second version',
            'char_count' => 14,
        ]))->assertStatus(200);

        $this->assertDatabaseCount('resume_chunks', 1);
        $this->assertDatabaseHas('resume_chunks', [
            'candidate_id' => '1AbCdEfGhIjKlMnOpQrStUvWxYz',
            'chunk_type'   => 'skills',
            'content'      => 'second version',
            'char_count'   => 14,
        ]);
    }

    public function test_store_chunk_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/resumes/chunks', $this->validPayload());

        $response->assertStatus(401);
        $this->assertDatabaseCount('resume_chunks', 0);
    }
}
