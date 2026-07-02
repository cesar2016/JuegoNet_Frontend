<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('raffles', function (Blueprint $table) {
            $table->json('prizes')->nullable()->after('prizes_count');
        });
    }

    public function down(): void
    {
        Schema::table('raffles', function (Blueprint $table) {
            $table->dropColumn('prizes');
        });
    }
};
