<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('course_image_url', 500)->nullable()->after('teacher');
            $table->string('level', 50)->nullable()->after('course_image_url');
            $table->json('learning_material')->nullable()->after('level');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn(['course_image_url', 'level', 'learning_material']);
        });
    }
};
