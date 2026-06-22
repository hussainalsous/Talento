<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // Super admin with all permissions
        $superAdminUser = User::firstOrCreate(
            ['email' => 'superadmin@jobportal.com'],
            [
                'phone'     => '+1000000000',
                'password'  => Hash::make('password'),
                'role'      => 'admin',
                'is_active' => true,
            ]
        );

        Admin::firstOrCreate(
            ['user_id' => $superAdminUser->id],
            [
                'first_name'  => 'Super',
                'last_name'   => 'Admin',
                'permissions' => ['*'], // wildcard = all permissions
            ]
        );

        // Regular admin with limited permissions
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@jobportal.com'],
            [
                'phone'     => '+1000000001',
                'password'  => Hash::make('password'),
                'role'      => 'admin',
                'is_active' => true,
            ]
        );

        Admin::firstOrCreate(
            ['user_id' => $adminUser->id],
            [
                'first_name'  => 'Portal',
                'last_name'   => 'Admin',
                'permissions' => [
                    'manage_users',
                    'manage_company_requests',
                    'manage_cvs',
                    'manage_courses',
                ],
            ]
        );
    }
}
