<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('extract_numbers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('extract_id')->constrained()->cascadeOnDelete();
            $table->tinyInteger('position')->unsigned();
            $table->string('number', 4);

            $table->unique(['extract_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('extract_numbers');
    }
};
