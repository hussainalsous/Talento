<?php

namespace App\Console\Commands;

use App\Models\User;
use Database\Seeders\N8nServiceUserSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class N8nToken extends Command
{
    protected $signature   = 'n8n:token';
    protected $description = 'Rotate the Sanctum Bearer token used by n8n to call /api/v1/resumes/*';

    public function handle(): int
    {
        $user = User::firstOrCreate(
            ['email' => N8nServiceUserSeeder::EMAIL],
            [
                'password'  => Hash::make(Str::random(32)),
                'role'      => 'admin',
                'is_active' => true,
            ]
        );

        // Remove any existing tokens with this name so re-running rotates cleanly.
        $user->tokens()->where('name', 'n8n-pipeline')->delete();

        $token = $user->createToken('n8n-pipeline')->plainTextToken;

        $this->line('');
        $this->line($token);
        $this->line('');
        $this->info("Paste this into the n8n 'Header Auth' credential as: Bearer {$token}");

        return self::SUCCESS;
    }
}
