<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name'          => 'Free',
                'description'   => 'Basic plan for small companies getting started.',
                'price'         => 0.00,
                'billing_cycle' => 'free',
                'max_job_posts' => 3,
                'max_members'   => 2,
                'is_active'     => true,
            ],
            [
                'name'          => 'Starter',
                'description'   => 'For growing companies with moderate hiring needs.',
                'price'         => 49.00,
                'billing_cycle' => 'monthly',
                'max_job_posts' => 15,
                'max_members'   => 10,
                'is_active'     => true,
            ],
            [
                'name'          => 'Professional',
                'description'   => 'For companies with active recruitment pipelines.',
                'price'         => 149.00,
                'billing_cycle' => 'monthly',
                'max_job_posts' => 50,
                'max_members'   => null, // unlimited
                'is_active'     => true,
            ],
            [
                'name'          => 'Enterprise',
                'description'   => 'Unlimited job posts and members. Full feature access.',
                'price'         => 399.00,
                'billing_cycle' => 'monthly',
                'max_job_posts' => null, // unlimited
                'max_members'   => null,
                'is_active'     => true,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::firstOrCreate(['name' => $plan['name']], $plan);
        }
    }
}
