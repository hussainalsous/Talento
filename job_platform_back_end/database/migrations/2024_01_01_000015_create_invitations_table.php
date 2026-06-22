<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            // The company member user who sent the invitation
            $table->foreignId('invited_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('job_seeker_id')->constrained()->cascadeOnDelete();
            // Optional: invite for a specific job post
            $table->foreignId('job_post_id')->nullable()->constrained()->nullOnDelete();
            $table->text('message')->nullable();
            $table->enum('status', ['pending', 'accepted', 'declined'])->default('pending');
            $table->timestamp('sent_at')->useCurrent();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->index('company_id');
            $table->index('job_seeker_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invitations');
    }
};
