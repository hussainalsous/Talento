<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            // Which company member (user) created the post
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            // Optional link to a canonical job title record
            $table->foreignId('job_title_id')->nullable()->constrained('job_titles')->nullOnDelete();
            // Standalone title when job_title_id is not linked
            $table->string('title', 200);
            $table->text('description');
            $table->string('location', 200)->nullable();
            $table->enum('employment_type', ['full_time', 'part_time', 'remote', 'contract', 'internship', 'freelance']);
            $table->decimal('salary_min', 10, 2)->unsigned()->nullable();
            $table->decimal('salary_max', 10, 2)->unsigned()->nullable();
            $table->text('responsibilities')->nullable();
            $table->text('requirements')->nullable();
            $table->enum('status', ['draft', 'published', 'closed', 'archived'])->default('draft');
            $table->timestamp('expires_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index('company_id');
            $table->index('status');
            $table->index('employment_type');
            $table->index('location');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_posts');
    }
};
