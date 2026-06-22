<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_seekers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('current_job', 200)->nullable();
            $table->string('location', 200)->nullable();
            $table->enum('preferred_job_type', ['full_time', 'part_time', 'remote', 'contract', 'internship', 'freelance'])->nullable();
            $table->decimal('desired_salary', 10, 2)->unsigned()->nullable();
            // Privacy settings — normalized as separate columns instead of JSON for easier querying
            $table->enum('profile_visibility', ['public', 'limited', 'private'])->default('public');
            $table->enum('cv_visibility', ['public', 'upon_request', 'private'])->default('public');
            $table->timestamp('last_updated_at')->nullable();
            $table->timestamps();

            $table->unique('user_id');
            $table->index('location');
            $table->index('preferred_job_type');
            $table->index('profile_visibility');
            $table->index('cv_visibility');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_seekers');
    }
};
