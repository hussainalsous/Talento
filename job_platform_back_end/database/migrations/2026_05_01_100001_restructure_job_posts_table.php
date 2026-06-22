<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Add new columns and temp JSON columns for the text-to-JSON conversion
        Schema::table('job_posts', function (Blueprint $table) {
            $table->integer('experience_years')->nullable()->after('requirements');
            $table->string('level', 50)->nullable()->after('experience_years');
            $table->string('job_type', 50)->nullable()->after('level');
            $table->json('responsibilities_new')->nullable()->after('job_type');
            $table->json('requirements_new')->nullable()->after('responsibilities_new');
        });

        // Step 2: Migrate existing text data into JSON arrays
        DB::table('job_posts')->orderBy('id')->each(function ($post) {
            DB::table('job_posts')->where('id', $post->id)->update([
                'responsibilities_new' => $this->textToJsonArray($post->responsibilities),
                'requirements_new'     => $this->textToJsonArray($post->requirements),
            ]);
        });

        // Step 3: Drop the old TEXT columns
        Schema::table('job_posts', function (Blueprint $table) {
            $table->dropColumn(['responsibilities', 'requirements']);
        });

        // Step 4: Rename temp JSON columns to final names
        Schema::table('job_posts', function (Blueprint $table) {
            $table->renameColumn('responsibilities_new', 'responsibilities');
            $table->renameColumn('requirements_new', 'requirements');
        });
    }

    public function down(): void
    {
        // Remove new fields
        Schema::table('job_posts', function (Blueprint $table) {
            $table->dropColumn(['experience_years', 'level', 'job_type']);
        });

        // Add temp TEXT columns
        Schema::table('job_posts', function (Blueprint $table) {
            $table->text('responsibilities_old')->nullable();
            $table->text('requirements_old')->nullable();
        });

        // Restore text from JSON arrays
        DB::table('job_posts')->orderBy('id')->each(function ($post) {
            $responsibilities = $this->jsonArrayToText($post->responsibilities);
            $requirements     = $this->jsonArrayToText($post->requirements);
            DB::table('job_posts')->where('id', $post->id)->update([
                'responsibilities_old' => $responsibilities,
                'requirements_old'     => $requirements,
            ]);
        });

        // Drop JSON columns
        Schema::table('job_posts', function (Blueprint $table) {
            $table->dropColumn(['responsibilities', 'requirements']);
        });

        // Rename TEXT columns back
        Schema::table('job_posts', function (Blueprint $table) {
            $table->renameColumn('responsibilities_old', 'responsibilities');
            $table->renameColumn('requirements_old', 'requirements');
        });
    }

    private function textToJsonArray(?string $text): ?string
    {
        if ($text === null || $text === '') {
            return null;
        }

        // Already a JSON array — keep as-is
        $decoded = json_decode($text, true);
        if (is_array($decoded)) {
            return $text;
        }

        // Split plain text by newlines, strip empty lines
        $lines = array_values(array_filter(
            array_map('trim', explode("\n", $text)),
            fn ($line) => $line !== ''
        ));

        return json_encode(empty($lines) ? [$text] : $lines);
    }

    private function jsonArrayToText(?string $json): ?string
    {
        if ($json === null || $json === '') {
            return null;
        }

        $decoded = json_decode($json, true);

        return is_array($decoded) ? implode("\n", $decoded) : $json;
    }
};
