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
        Schema::create('job_embed_meta', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_post_id')
                ->unique()
                ->constrained('job_posts')
                ->cascadeOnDelete();
            $table->string('model');
            $table->integer('dimensions');
            $table->integer('char_count')->default(0);
            $table->string('qdrant_collection')->default('talento_job_embeddings');
            $table->string('qdrant_point_id')->nullable();
            $table->enum('status', ['pending', 'embedded', 'failed'])->default('pending');
            $table->timestamp('embedded_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('qdrant_point_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_embed_meta');
    }
};
