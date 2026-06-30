<?php

use App\Models\Raffle;
use Illuminate\Support\Facades\Broadcast;

try {
    Broadcast::routes(['middleware' => ['auth:sanctum']]);

    Broadcast::channel('user.{id}', function ($user, $id) {
        return (int) $user->id === (int) $id;
    });

    Broadcast::channel('admin.{id}', function ($user, $id) {
        return (int) $user->id === (int) $id && $user->isAdmin();
    });

    Broadcast::channel('raffle.{id}', function ($user, $id) {
        $raffle = Raffle::find($id);
        if (! $raffle) {
            return false;
        }
        if ($user->isSuperAdmin()) {
            return true;
        }
        if ($user->isAdmin()) {
            return (int) $raffle->admin_id === (int) $user->id;
        }

        return (int) $raffle->admin_id === (int) $user->admin_id;
    });
} catch (\Throwable $e) {
    // Broadcaster not available during build (config:cache), skip channel registration.
}
