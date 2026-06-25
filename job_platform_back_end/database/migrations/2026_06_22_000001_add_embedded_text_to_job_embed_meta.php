<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_embed_meta', function (Blueprint $table) {
            $table->text('embedded_text')->nullable()->after('char_count');
        });
    }

    public function down(): void
    {
        Schema::table('job_embed_meta', function (Blueprint $table) {
            $table->dropColumn('embedded_text');
        });
    }
};
