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
        Schema::create('resume_chunks', function (Blueprint $table) {
            $table->id();
            $table->string('candidate_id', 191)->index(); // Google Drive file ID (191 keeps the composite unique index within MySQL's utf8 key-length limit)
            $table->string('chunk_type', 100); // skills | education | experience | additional_information
            $table->text('content');
            $table->integer('char_count')->default(0);
            $table->timestamp('validated_at')->nullable();
            $table->timestamps();

            $table->unique(['candidate_id', 'chunk_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('resume_chunks');
    }
};
