<?php

namespace App\Http\Controllers;

use App\Events\AdminNotification;
use App\Models\User;
use Illuminate\Support\Facades\Log;

abstract class Controller
{
    protected function broadcastToAdminAndSuperAdmins(int $adminId, string $type, array $data = []): void
    {
        try {
            broadcast(new AdminNotification($adminId, $type, $data));
            $superAdminIds = User::where('role', 'super_admin')
                ->where('id', '!=', $adminId)
                ->pluck('id');
            foreach ($superAdminIds as $saId) {
                broadcast(new AdminNotification($saId, $type, $data));
            }
        } catch (\Throwable $e) {
            Log::error("Broadcast {$type} failed", ['error' => $e->getMessage()]);
        }
    }
}
