<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('redoblonas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bet_id')->constrained()->cascadeOnDelete();
            $table->string('first_number', 2);
            $table->string('second_number', 2);
            $table->tinyInteger('first_range')->unsigned();
            $table->tinyInteger('second_range')->unsigned();
            $table->decimal('amount', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('redoblonas');
    }
};
