<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $superAdmin = User::firstWhere('role', 'super_admin');

        if (! $superAdmin) {
            $superAdmin = User::create([
                'name' => 'Super Admin',
                'email' => 'admin@jueganet.com',
                'password' => Hash::make('admin123'),
                'role' => 'super_admin',
                'status' => 'approved',
            ]);
        }

        $adminA = User::firstOrCreate(
            ['email' => 'admin_a@jueganet.com'],
            [
                'name' => 'Admin A',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'status' => 'approved',
                'admin_id' => $superAdmin->id,
            ]
        );

        $adminB = User::firstOrCreate(
            ['email' => 'admin_b@jueganet.com'],
            [
                'name' => 'Admin B',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'status' => 'approved',
                'admin_id' => $superAdmin->id,
            ]
        );

        $usersA = [
            ['name' => 'Juan Pérez', 'email' => 'juan.perez@email.com'],
            ['name' => 'María García', 'email' => 'maria.garcia@email.com'],
            ['name' => 'Carlos Rodríguez', 'email' => 'carlos.rodriguez@email.com'],
            ['name' => 'Ana Martínez', 'email' => 'ana.martinez@email.com'],
            ['name' => 'Pedro López', 'email' => 'pedro.lopez@email.com'],
        ];

        $usersB = [
            ['name' => 'Sofía Fernández', 'email' => 'sofia.fernandez@email.com'],
            ['name' => 'Martín González', 'email' => 'martin.gonzalez@email.com'],
            ['name' => 'Laura Sánchez', 'email' => 'laura.sanchez@email.com'],
            ['name' => 'Lucas Díaz', 'email' => 'lucas.diaz@email.com'],
            ['name' => 'Valentina Torres', 'email' => 'valentina.torres@email.com'],
        ];

        foreach ($usersA as $u) {
            User::firstOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'password' => Hash::make('admin123'),
                    'role' => 'user',
                    'status' => 'pending_approval',
                    'admin_id' => $adminA->id,
                ]
            );
        }

        foreach ($usersB as $u) {
            User::firstOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'password' => Hash::make('admin123'),
                    'role' => 'user',
                    'status' => 'pending_approval',
                    'admin_id' => $adminB->id,
                ]
            );
        }
    }
}
