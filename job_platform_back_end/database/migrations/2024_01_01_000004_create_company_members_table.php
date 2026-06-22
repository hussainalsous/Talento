<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            // Role within the company (distinct from system role)
            $table->string('role_in_company', 100)->default('member');
            // Which company_member or user invited this member (nullable = owner created account)
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique('user_id'); // One user can only be a member of one company
            $table->index('company_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_members');
    }
};
