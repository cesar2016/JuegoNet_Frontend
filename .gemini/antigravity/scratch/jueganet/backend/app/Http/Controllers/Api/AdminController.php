<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AdminController extends Controller
{
    public function pendingUsers(): JsonResponse
    {
        $users = User::where('status', 'pending_approval')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($users);
    }

    public function approveUser(User $user): JsonResponse
    {
        if ($user->status !== 'pending_approval') {
            return response()->json(['message' => 'El usuario no está pendiente de aprobación.'], 400);
        }

        $user->update(['status' => 'approved']);

        return response()->json(['message' => 'Usuario aprobado.', 'user' => $user]);
    }

    public function rejectUser(User $user): JsonResponse
    {
        if ($user->status !== 'pending_approval') {
            return response()->json(['message' => 'El usuario no está pendiente de aprobación.'], 400);
        }

        $user->update(['status' => 'rejected']);

        return response()->json(['message' => 'Usuario rechazado.', 'user' => $user]);
    }

    public function pendingOrders(): JsonResponse
    {
        $this->releaseExpiredPendingOrders();

        $orders = Order::where('status', 'pending_admin')
            ->with('user', 'raffle', 'tickets')
            ->orderBy('confirmed_at', 'asc')
            ->get()
            ->map(function ($order) {
                $now = now();
                $confirmedAt = $order->confirmed_at;
                $remaining = $confirmedAt
                    ? $now->diffInSeconds($confirmedAt->copy()->addMinutes(15), false)
                    : 0;

                return [
                    'order' => $order,
                    'remaining_seconds' => max(0, $remaining),
                ];
            });

        return response()->json($orders);
    }

    public function approveOrder(Order $order): JsonResponse
    {
        if ($order->status !== 'pending_admin') {
            return response()->json(['message' => 'La orden no está pendiente de validación.'], 400);
        }

        return DB::transaction(function () use ($order) {
            $order->update(['status' => 'sold']);
            $order->tickets()->update(['status' => 'sold']);

            return response()->json([
                'message' => 'Apuesta aceptada. Números vendidos.',
                'order' => $order->fresh()->load('tickets'),
            ]);
        });
    }

    public function rejectOrder(Order $order): JsonResponse
    {
        if ($order->status !== 'pending_admin') {
            return response()->json(['message' => 'La orden no está pendiente de validación.'], 400);
        }

        return DB::transaction(function () use ($order) {
            $order->tickets()->update([
                'status' => 'available',
                'order_id' => null,
                'user_id' => null,
                'reserved_at' => null,
            ]);
            $order->update(['status' => 'rejected']);

            return response()->json([
                'message' => 'Apuesta rechazada. Números liberados.',
                'order' => $order->fresh(),
            ]);
        });
    }

    private function releaseExpiredPendingOrders(): void
    {
        $expired = Order::where('status', 'pending_admin')
            ->where('confirmed_at', '<=', now()->subMinutes(15))
            ->get();

        foreach ($expired as $order) {
            DB::transaction(function () use ($order) {
                $order->tickets()->update([
                    'status' => 'available',
                    'order_id' => null,
                    'user_id' => null,
                    'reserved_at' => null,
                ]);
                $order->update(['status' => 'expired']);
            });
        }
    }

    public function allOrders(Request $request): JsonResponse
    {
        $this->releaseExpiredPendingOrders();

        $query = Order::query()->with('user', 'raffle', 'tickets');

        $q = $request->input('q');
        if ($q) {
            $query->where(function ($sub) use ($q) {
                $sub->whereHas('user', function ($u) use ($q) {
                    $u->where('name', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%");
                })->orWhereHas('raffle', function ($r) use ($q) {
                    $r->where('name', 'like', "%{$q}%");
                })->orWhere('total_price', 'like', "%{$q}%")
                  ->orWhere('status', 'like', "%{$q}%");
            });
        }

        $status = $request->input('status', 'all');
        if ($status === 'ongoing') {
                $query->where('status', 'pending_admin');
        } elseif ($status === 'finished') {
            $query->whereIn('status', ['sold', 'rejected']);
        } elseif ($status !== 'all') {
            $query->where('status', $status);
        }

        $perPage = (int) $request->input('per_page', 10);
        if (!in_array($perPage, [5, 10, 20, 30, 50, 100], true)) {
            $perPage = 10;
        }

        $now = now();
        $orders = $query->orderBy('created_at', 'desc')->paginate($perPage);

        $data = collect($orders->items())->map(function ($order) use ($now) {
            $confirmedAt = $order->confirmed_at;
            $remaining = $confirmedAt
                ? $now->diffInSeconds($confirmedAt->copy()->addMinutes(15), false)
                : 0;
            return [
                'order' => $order,
                'remaining_seconds' => max(0, $remaining),
            ];
        });

        return response()->json([
            'data' => $data,
            'current_page' => $orders->currentPage(),
            'last_page' => $orders->lastPage(),
            'per_page' => $orders->perPage(),
            'total' => $orders->total(),
            'from' => $orders->firstItem(),
            'to' => $orders->lastItem(),
        ]);
    }

    public function listUsers(Request $request): JsonResponse
    {
        $query = User::query();

        $q = $request->input('q');
        if ($q) {
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('whatsapp', 'like', "%{$q}%")
                    ->orWhere('status', 'like', "%{$q}%")
                    ->orWhere('role', 'like', "%{$q}%");
            });
        }

        $status = $request->input('status');
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $perPage = (int) $request->input('per_page', 10);
        if (!in_array($perPage, [5, 10, 20, 30, 50, 100], true)) {
            $perPage = 10;
        }

        $users = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($users);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'whatsapp' => 'nullable|string|max:20',
            'avatar' => 'nullable|string|max:255',
            'status' => 'sometimes|in:pending_approval,approved,rejected,blocked',
            'role' => 'sometimes|in:user,super_admin',
        ]);

        $user->update($validated);

        return response()->json(['message' => 'Perfil actualizado.', 'user' => $user->fresh()]);
    }

    public function blockUser(User $user): JsonResponse
    {
        $user->update(['status' => 'blocked']);
        return response()->json(['message' => 'Usuario bloqueado.', 'user' => $user->fresh()]);
    }

    public function unblockUser(User $user): JsonResponse
    {
        $user->update(['status' => 'approved']);
        return response()->json(['message' => 'Usuario desbloqueado.', 'user' => $user->fresh()]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $path = $request->file('avatar')->store('avatars', 'public');

        $url = Storage::url($path);

        return response()->json(['url' => url($url)]);
    }
}
