<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('job_candidate_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_post_id')
                ->constrained('job_posts')
                ->cascadeOnDelete();
            $table->foreignId('candidate_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->decimal('match_score', 5, 4);
            $table->json('score_breakdown')->nullable();
            $table->enum('status', ['new', 'viewed', 'shortlisted', 'auto_shortlisted', 'rejected'])
                ->default('new');
            $table->enum('matched_by', ['cv_upload', 'job_publish', 'scheduled_rerank'])
                ->default('cv_upload');
            $table->timestamp('matched_at')->useCurrent();
            $table->timestamp('notified_at')->nullable();
            $table->timestamps();

            $table->unique(['job_post_id', 'candidate_id']);
            $table->index('match_score');
            $table->index('status');
            $table->index('matched_at');
            $table->index(['job_post_id', 'match_score']);
            $table->index(['candidate_id', 'match_score']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_candidate_matches');
    }
};
