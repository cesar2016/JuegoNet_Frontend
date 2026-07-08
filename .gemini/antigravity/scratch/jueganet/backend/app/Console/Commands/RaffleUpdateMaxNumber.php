<?php

namespace App\Console\Commands;

use App\Models\Raffle;
use App\Models\Ticket;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RaffleUpdateMaxNumber extends Command
{
    protected $signature = 'raffle:update-max-number {id : Raffle ID} {max : New max number}';
    protected $description = 'Update max_number of an existing raffle and generate missing tickets';

    public function handle(): int
    {
        $raffle = Raffle::find((int) $this->argument('id'));

        if (! $raffle) {
            $this->error("Raffle ID {$this->argument('id')} not found.");
            return 1;
        }

        $newMax = (int) $this->argument('max');
        $currentMax = $raffle->tickets()->max('number') ?? 0;

        if ($newMax <= $currentMax) {
            $this->error("New max ({$newMax}) must be greater than current max ({$currentMax}).");
            return 1;
        }

        if ($newMax > 500) {
            $this->error('Max cannot exceed 500.');
            return 1;
        }

        $this->info("Raffle: {$raffle->name} (ID: {$raffle->id})");
        $this->info("Current max_number: {$raffle->max_number}, Current max ticket: {$currentMax}");
        $this->info("New max: {$newMax}");
        $this->info("Tickets to generate: " . ($newMax - $currentMax));

        if (! $this->confirm("Proceed with updating to max {$newMax}?")) {
            $this->info('Cancelled.');
            return 0;
        }

        DB::transaction(function () use ($raffle, $newMax, $currentMax) {
            $raffle->update(['max_number' => $newMax]);

            for ($i = $currentMax + 1; $i <= $newMax; $i++) {
                Ticket::create([
                    'raffle_id' => $raffle->id,
                    'number' => $i,
                    'status' => 'available',
                ]);
            }
        });

        $this->info("Done. Raffle {$raffle->id} now has max_number={$newMax} and " . ($newMax - $currentMax) . " new tickets created.");
        return 0;
    }
}
