<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            // The company owner user — set after admin approves registration
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name', 200);
            $table->string('registration_number', 100)->unique();
            $table->string('website', 255)->nullable();
            $table->string('address', 500)->nullable();
            $table->string('country', 100)->nullable();
            $table->text('description')->nullable();
            $table->string('logo_path', 500)->nullable();
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('approved');
            // Tracks which admin approved / rejected
            $table->foreignId('approved_by')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index('approval_status');
            $table->index('country');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
