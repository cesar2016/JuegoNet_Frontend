<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bets', function (Blueprint $table) {
            $table->id();
            $table->string('sequence', 30)->unique();
            $table->foreignId('user_id')->constrained();
            $table->foreignId('draw_id')->constrained();
            $table->date('draw_date');
            $table->decimal('subtotal', 10, 2);
            $table->decimal('total', 10, 2);
            $table->enum('status', ['active', 'won', 'lost', 'paid'])->default('active');
            $table->timestamps();

            $table->index(['draw_date', 'draw_id']);
            $table->index('sequence');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bets');
    }
};
