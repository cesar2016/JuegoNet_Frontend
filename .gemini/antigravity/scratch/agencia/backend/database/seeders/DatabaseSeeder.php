<?php

namespace Database\Seeders;

use App\Models\Draw;
use App\Models\Lottery;
use App\Models\LotteryDrawSchedule;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $superAdmin = User::create([
            'name'     => 'Super Admin',
            'email'    => 'super@agencia.com',
            'password' => bcrypt('1234'),
        ]);

        $admin = User::create([
            'name'     => 'Admin',
            'email'    => 'admin@agencia.com',
            'password' => bcrypt('1234'),
        ]);

        $pasador = User::create([
            'name'     => 'Pasador Demo',
            'email'    => 'pasador@agencia.com',
            'password' => bcrypt('1234'),
        ]);

        $roleSuper = Role::create(['name' => 'super_admin']);
        $roleAdmin = Role::create(['name' => 'admin']);
        $roleUser  = Role::create(['name' => 'usuario']);

        $superAdmin->assignRole($roleSuper);
        $admin->assignRole($roleAdmin);
        $pasador->assignRole($roleUser);

        $lotteries = [
            ['name' => 'Nacional', 'initials' => 'NAC'],
            ['name' => 'Provincia', 'initials' => 'PBA'],
            ['name' => 'Santa Fe', 'initials' => 'SF'],
            ['name' => 'Córdoba', 'initials' => 'CBA'],
            ['name' => 'Uruguay', 'initials' => 'URU'],
            ['name' => 'Entre Ríos', 'initials' => 'ER'],
            ['name' => 'Mendoza', 'initials' => 'MZA'],
            ['name' => 'Corrientes', 'initials' => 'CTES'],
            ['name' => 'Chaco', 'initials' => 'CH'],
            ['name' => 'Catamarca', 'initials' => 'CAT'],
            ['name' => 'Formosa', 'initials' => 'FSA'],
            ['name' => 'Jujuy', 'initials' => 'JUJ'],
            ['name' => 'La Rioja', 'initials' => 'LR'],
            ['name' => 'Misiones', 'initials' => 'MIS'],
            ['name' => 'Misiones Plus', 'initials' => 'MIS+'],
            ['name' => 'Neuquén', 'initials' => 'NQN'],
            ['name' => 'Río Negro', 'initials' => 'RN'],
            ['name' => 'Salta', 'initials' => 'SAL'],
            ['name' => 'San Luis', 'initials' => 'SL'],
            ['name' => 'Santa Cruz', 'initials' => 'SC'],
            ['name' => 'Santiago', 'initials' => 'SGO'],
            ['name' => 'Tucumán', 'initials' => 'TUC'],
        ];

        $draws = [
            ['name' => 'La Previa', 'order' => 1],
            ['name' => 'La Primera', 'order' => 2],
            ['name' => 'Matutina', 'order' => 3],
            ['name' => 'Vespertina', 'order' => 4],
            ['name' => 'Nocturna', 'order' => 5],
        ];

        foreach ($lotteries as $l) {
            Lottery::create($l);
        }

        foreach ($draws as $d) {
            Draw::create($d);
        }

        $times = [
            ['draw_time' => '10:00', 'closing_time' => '09:45'],
            ['draw_time' => '12:00', 'closing_time' => '11:45'],
            ['draw_time' => '15:00', 'closing_time' => '14:45'],
            ['draw_time' => '18:00', 'closing_time' => '17:45'],
            ['draw_time' => '21:00', 'closing_time' => '20:45'],
        ];

        $lotteryIds = Lottery::pluck('id');
        $drawIds = Draw::pluck('id');

        foreach ($lotteryIds as $lotteryId) {
            foreach ($drawIds as $i => $drawId) {
                LotteryDrawSchedule::create([
                    'lottery_id'   => $lotteryId,
                    'draw_id'      => $drawId,
                    'draw_time'    => $times[$i]['draw_time'],
                    'closing_time' => $times[$i]['closing_time'],
                ]);
            }
        }
    }
}
