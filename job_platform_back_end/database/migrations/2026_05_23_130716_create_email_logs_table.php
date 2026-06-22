<?php

use App\Enum\EmailStatus;
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
        Schema::create('email_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('sender_id');
            $table->string('subject');
            $table->string('to_email');
            $table->text('body');
            $table->enum('status' , [EmailStatus::SENT->value, EmailStatus::FAILED->value, EmailStatus::PENDING->value])->default(EmailStatus::PENDING->value);
            $table->text('error_message')->nullable();
            $table->timestamps();
            $table->foreign('sender_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_logs');
    }
};
