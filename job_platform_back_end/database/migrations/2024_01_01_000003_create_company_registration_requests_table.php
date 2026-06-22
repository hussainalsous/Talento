<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_registration_requests', function (Blueprint $table) {
            $table->id();
            // Company info submitted in the request
            $table->string('company_name', 200);
            $table->string('registration_number', 100)->unique();
            $table->string('website', 255)->nullable();
            $table->string('address', 500)->nullable();
            $table->string('country', 100)->nullable();
            $table->text('description')->nullable();
            $table->string('logo_path', 500)->nullable();
            // Requester (future owner) personal info
            $table->string('requester_first_name', 100);
            $table->string('requester_last_name', 100);
            $table->string('requester_email', 255)->unique();
            $table->string('requester_phone', 30)->nullable();
            // Hashed password — stored temporarily until approved
            $table->string('password');
            // Admin review fields
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            // Once approved, link to created company
            $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_registration_requests');
    }
};
