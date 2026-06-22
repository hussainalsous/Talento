<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cvs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_seeker_id')->constrained()->cascadeOnDelete();
            $table->string('title', 200);
            $table->string('file_path', 500)->nullable();
            // Parsed CV data from analysis service (structured JSON)
            $table->json('parsed_data')->nullable();
            // Only one CV can be primary per job seeker
            $table->boolean('is_primary')->default(false);
            // Visibility override per CV (overrides job seeker default if set)
            $table->enum('visibility', ['public', 'upon_request', 'private'])->default('public');
            $table->softDeletes();
            $table->timestamps();

            $table->index('job_seeker_id');
            $table->index('is_primary');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cvs');
    }
};
