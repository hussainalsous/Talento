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
        Schema::table('users', function (Blueprint $table) {
            // Links a job-seeker user to their Qdrant candidate_id (the Google Drive file ID
            // produced by the CV upload pipeline). Nullable: not every user has a CV embedded.
            $table->string('google_drive_file_id', 191)->nullable()->unique()->after('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['google_drive_file_id']);
            $table->dropColumn('google_drive_file_id');
        });
    }
};
