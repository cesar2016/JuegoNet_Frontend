<?php

namespace Database\Seeders;

use App\Models\Draw;
use App\Models\Extract;
use App\Models\ExtractNumber;
use App\Models\Lottery;
use App\Models\User;
use Illuminate\Database\Seeder;

class ExtractDemoSeeder extends Seeder
{
    public function run(): void
    {
        $drawName = env('EXTRACT_DEMO_DRAW', 'La Primera');
        $draw = Draw::where('name', $drawName)->first();

        if (!$draw) {
            $this->command->error("Sorteo \"{$drawName}\" no encontrado. Opciones: " . Draw::pluck('name')->implode(', '));
            return;
        }

        $admin = User::role('admin')->first() ?? User::first();
        $date = now()->format('Y-m-d');
        $lotteries = Lottery::all();

        foreach ($lotteries as $lottery) {
            $exists = Extract::where('lottery_id', $lottery->id)
                ->where('draw_id', $draw->id)
                ->where('draw_date', $date)
                ->exists();

            if ($exists) {
                $this->command->warn("Ya existe extracto para {$lottery->name} / {$draw->name} / {$date}, se saltea.");
                continue;
            }

            $extract = Extract::create([
                'lottery_id' => $lottery->id,
                'draw_id'    => $draw->id,
                'draw_date'  => $date,
                'status'     => 'pending',
                'source'     => 'manual',
                'created_by' => $admin->id,
            ]);

            $forced = [];
            if ($lottery->initials === 'NAC') {
                $forced = [1 => '2715', 2 => '8815', 7 => '4478'];
            } elseif ($lottery->initials === 'PBA') {
                $forced = [1 => '6278', 4 => '6785', 7 => '4478'];
            }

            $used = [];
            for ($position = 1; $position <= 20; $position++) {
                if (isset($forced[$position])) {
                    $number = $forced[$position];
                } else {
                    do {
                        $number = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
                    } while (in_array($number, $used));
                }
                $used[] = $number;

                ExtractNumber::create([
                    'extract_id' => $extract->id,
                    'position'   => $position,
                    'number'     => $number,
                ]);
            }

            $this->command->info("Extracto creado: {$lottery->name} / {$draw->name} / {$date}");
        }
    }
}
