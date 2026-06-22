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
        Schema::create('resume_embedding_meta', function (Blueprint $table) {
            $table->id();
            $table->string('candidate_id', 191)->index(); // Google Drive file ID (191 keeps the composite unique index within MySQL's utf8 key-length limit)
            $table->string('chunk_type', 100); // skills | education | experience | additional_information
            $table->string('model', 255); // e.g. mistralai/mistral-embed-2312
            $table->integer('dimensions'); // e.g. 1024
            $table->integer('char_count')->default(0);
            $table->string('qdrant_collection', 255)->default('talento_cv_embeddings');
            $table->string('qdrant_point_id', 255)->nullable();
            $table->timestamp('embedded_at')->nullable();
            $table->timestamps();

            $table->unique(['candidate_id', 'chunk_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('resume_embedding_meta');
    }
};
