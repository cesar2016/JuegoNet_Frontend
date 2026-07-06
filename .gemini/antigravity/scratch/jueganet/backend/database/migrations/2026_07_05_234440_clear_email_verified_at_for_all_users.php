<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('users')->whereNotNull('email_verified_at')->update(['email_verified_at' => null]);
    }

    public function down(): void
    {
        // No way to restore
    }
};
