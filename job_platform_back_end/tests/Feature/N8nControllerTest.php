<?php

namespace Tests\Feature;

use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class N8nControllerTest extends TestCase
{
    /**
     * Authenticate as an arbitrary user — the endpoint only requires a valid
     * Sanctum token, not a specific role.
     */
    private function authenticate(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['*']);
    }

    public function test_log_error_stores_to_database(): void
    {
        $this->authenticate();

        $response = $this->postJson('/api/v1/n8n/log-error', [
            'workflow'  => 'CV Embedding Pipeline',
            'node'      => 'Mistral Embed',
            'error'     => 'Rate limit exceeded (429)',
            'failed_at' => '2026-06-20T10:10:00Z',
        ]);

        $response->assertStatus(200)
                 ->assertJson(['ok' => true]);

        $this->assertDatabaseHas('n8n_error_logs', [
            'workflow'  => 'CV Embedding Pipeline',
            'node'      => 'Mistral Embed',
            'error'     => 'Rate limit exceeded (429)',
            'failed_at' => '2026-06-20T10:10:00Z',
        ]);
    }

    public function test_log_error_accepts_null_fields(): void
    {
        $this->authenticate();

        $response = $this->postJson('/api/v1/n8n/log-error', []);

        $response->assertStatus(200)
                 ->assertJson(['ok' => true]);

        $this->assertDatabaseCount('n8n_error_logs', 1);
        $this->assertDatabaseHas('n8n_error_logs', [
            'workflow'  => null,
            'node'      => null,
            'error'     => null,
            'failed_at' => null,
        ]);
    }
}
