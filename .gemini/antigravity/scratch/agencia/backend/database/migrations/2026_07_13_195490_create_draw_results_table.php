<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('draw_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('extract_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bet_item_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('redoblona_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('prize_amount', 10, 2);
            $table->enum('status', ['pending', 'paid'])->default('pending');
            $table->timestamps();

            $table->index('extract_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('draw_results');
    }
};
