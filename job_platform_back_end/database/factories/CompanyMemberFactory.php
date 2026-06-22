<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CompanyMemberFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'         => User::factory()->companyMember(),
            'company_id'      => Company::factory(),
            'first_name'      => fake()->firstName(),
            'last_name'       => fake()->lastName(),
            'role_in_company' => 'member',
            'invited_by'      => null,
        ];
    }
}
