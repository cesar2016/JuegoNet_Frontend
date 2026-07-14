<?php

namespace Database\Seeders;

use App\Models\DrawResult;
use App\Models\Extract;
use App\Models\ExtractNumber;
use Illuminate\Database\Seeder;

class ExtractCleanSeeder extends Seeder
{
    public function run(): void
    {
        $totalExtracts = Extract::count();
        $totalResults = DrawResult::count();

        DrawResult::query()->delete();
        ExtractNumber::query()->delete();
        Extract::query()->delete();

        $this->command->info("Eliminados {$totalResults} resultados y {$totalExtracts} extractos.");
    }
}
