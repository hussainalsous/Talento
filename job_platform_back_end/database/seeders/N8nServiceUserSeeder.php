<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class N8nServiceUserSeeder extends Seeder
{
    public const EMAIL = 'n8n-service@talento.local';

    public function run(): void
    {
        User::firstOrCreate(
            ['email' => self::EMAIL],
            [
                'password'  => Hash::make(Str::random(32)),
                'role'      => 'admin',
                'is_active' => true,
            ]
        );

        $this->command->info('n8n service user ready: ' . self::EMAIL);
        $this->command->info('Run [php artisan n8n:token] to issue or rotate the Bearer token.');
    }
}
