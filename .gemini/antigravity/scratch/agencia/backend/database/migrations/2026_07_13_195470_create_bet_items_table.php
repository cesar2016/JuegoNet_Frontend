<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bet_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bet_id')->constrained()->cascadeOnDelete();
            $table->string('number', 4);
            $table->enum('type', ['primera', 'a_los_5', 'a_los_10', 'a_los_20']);
            $table->decimal('amount', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bet_items');
    }
};
