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
        Schema::create('n8n_error_logs', function (Blueprint $table) {
            $table->id();
            $table->string('workflow')->nullable();
            $table->string('node')->nullable();
            $table->text('error')->nullable();
            $table->string('failed_at')->nullable(); // raw string as sent by n8n
            $table->timestamp('created_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('n8n_error_logs');
    }
};
