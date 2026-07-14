<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('extracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lottery_id')->constrained();
            $table->foreignId('draw_id')->constrained();
            $table->date('draw_date');
            $table->enum('status', ['pending', 'completed'])->default('pending');
            $table->enum('source', ['manual', 'api', 'scraping'])->default('manual');
            $table->string('external_id', 100)->nullable();
            $table->json('raw_response')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->unique(['lottery_id', 'draw_id', 'draw_date']);
            $table->index('draw_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('extracts');
    }
};
