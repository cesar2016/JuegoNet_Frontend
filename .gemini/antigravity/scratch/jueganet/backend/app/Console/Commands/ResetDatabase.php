<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class ResetDatabase extends Command
{
    protected $signature = 'db:reset
                            {--force : Skips confirmation prompt for non-interactive environments}';

    protected $description = 'Borra toda la BD, ejecuta migrations fresh y crea solo un super admin';

    public function handle(): int
    {
        if (! $this->option('force') && ! $this->confirm('⚠️  Esto va a BORRAR TODOS LOS DATOS (rafas, órdenes, tickets, usuarios). ¿Estás seguro?')) {
            $this->info('Cancelado.');
            return self::SUCCESS;
        }

        $this->call('migrate:fresh');

        User::create([
            'name' => 'Super Admin',
            'email' => 'sadmin@jueganet.online',
            'password' => Hash::make('admin123'),
            'role' => 'super_admin',
            'status' => 'approved',
        ]);

        $this->info('✅ Base de datos reseteada.');
        $this->info('   Super admin: sadmin@jueganet.online / admin123');

        return self::SUCCESS;
    }
}
