<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('draw_results', function (Blueprint $table) {
            $table->unsignedTinyInteger('position')->nullable()->after('redoblona_id');
        });
    }

    public function down(): void
    {
        Schema::table('draw_results', function (Blueprint $table) {
            $table->dropColumn('position');
        });
    }
};
