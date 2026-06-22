<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_seeker_id')->constrained()->cascadeOnDelete();
            // CV used for this specific application (null = seeker's primary CV)
            $table->foreignId('cv_id')->nullable()->constrained('cvs')->nullOnDelete();
            $table->text('cover_letter')->nullable();
            // Status flow: submitted → under_review → shortlisted → accepted/rejected; seeker can withdraw
            $table->enum('status', [
                'submitted',
                'under_review',
                'shortlisted',
                'rejected',
                'accepted',
                'withdrawn',
            ])->default('submitted');
            // Match score (0-100) optionally set by company or matching service
            $table->unsignedTinyInteger('score')->nullable();
            $table->timestamp('applied_at')->useCurrent();
            $table->timestamps();

            // A job seeker can only apply once per job post
            $table->unique(['job_post_id', 'job_seeker_id']);
            $table->index('status');
            $table->index('job_post_id');
            $table->index('job_seeker_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_applications');
    }
};
