<?php

namespace App\Console\Commands;

use App\Models\Raffle;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DeleteRafflesByAdmin extends Command
{
    protected $signature = 'raffles:delete-by-admin {email : Admin email}';

    protected $description = 'Delete all raffles (active and inactive) created by a specific admin';

    public function handle(): int
    {
        $email = $this->argument('email');

        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("User with email {$email} not found.");

            return self::FAILURE;
        }

        $raffles = Raffle::where('admin_id', $user->id)->get();

        if ($raffles->isEmpty()) {
            $this->info('No raffles found for this admin.');

            return self::SUCCESS;
        }

        $this->line("Admin: {$user->name} ({$user->email})");
        $this->line("Total raffles found: {$raffles->count()}");
        $this->newLine();

        $this->table(
            ['ID', 'Name', 'Active', 'Start Time'],
            $raffles->map(fn (Raffle $raffle) => [
                $raffle->id,
                $raffle->name,
                $raffle->is_active ? 'Yes' : 'No',
                $raffle->start_time?->toDateTimeString() ?? 'N/A',
            ])
        );

        if (! $this->confirm('Are you sure you want to delete all these raffles? This action cannot be undone.')) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        $count = $raffles->count();

        DB::transaction(function () use ($raffles) {
            $raffleIds = $raffles->pluck('id');

            DB::table('tickets')->whereIn('raffle_id', $raffleIds)->delete();

            Raffle::whereIn('id', $raffleIds)->delete();
        });

        $this->info("Successfully deleted {$count} raffle(s) and their associated tickets.");

        return self::SUCCESS;
    }
}
