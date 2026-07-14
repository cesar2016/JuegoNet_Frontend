<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bet_lottery', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lottery_id')->constrained()->cascadeOnDelete();

            $table->unique(['bet_id', 'lottery_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bet_lottery');
    }
};
