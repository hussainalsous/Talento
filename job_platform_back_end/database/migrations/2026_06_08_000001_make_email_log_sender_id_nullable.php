<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Fixes audit bug B3: the email_logs.sender_id column was defined NOT NULL
// but SendEmail::handle() can legally write null when no sender user exists
// (e.g. system-initiated emails where no admin has been created yet).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('email_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('sender_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('email_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('sender_id')->nullable(false)->change();
        });
    }
};
