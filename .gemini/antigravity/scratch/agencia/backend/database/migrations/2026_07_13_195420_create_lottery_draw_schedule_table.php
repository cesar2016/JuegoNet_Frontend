<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lottery_draw_schedule', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lottery_id')->constrained()->cascadeOnDelete();
            $table->foreignId('draw_id')->constrained()->cascadeOnDelete();
            $table->time('draw_time');
            $table->time('closing_time');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['lottery_id', 'draw_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lottery_draw_schedule');
    }
};
