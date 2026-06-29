<?php

namespace App\Http\Controllers\Api;

use App\Events\AdminNotification;
use App\Events\OrderStatusChanged;
use App\Events\TicketStatusChanged;
use App\Http\Controllers\Controller;
use App\Models\AdminInvite;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    private function applyUserScope($query, User $authUser)
    {
        if (! $authUser->isSuperAdmin()) {
            $query->forAdmin($authUser->id);
        }

        return $query;
    }

    private function applyOrderScope($query, User $authUser)
    {
        if (! $authUser->isSuperAdmin()) {
            $query->forAdmin($authUser->id);
        }

        return $query;
    }

    public function pendingUsers(Request $request): JsonResponse
    {
        $query = User::where('status', 'pending_approval')->orderBy('created_at', 'desc');
        $this->applyUserScope($query, $request->user());

        return response()->json($query->get());
    }

    public function approveUser(Request $request, User $user): JsonResponse
    {
        $authUser = $request->user();
        if (! $authUser->isSuperAdmin() && $user->admin_id !== $authUser->id) {
            return response()->json(['message' => 'No tienes permisos para aprobar este usuario.'], 403);
        }

        if ($user->status !== 'pending_approval' && $user->status !== 'rejected') {
            return response()->json(['message' => 'El usuario no está pendiente de aprobación.'], 400);
        }

        $user->update(['status' => 'approved']);

        if ($user->admin_id) {
            broadcast(new AdminNotification($user->admin_id, 'pending_users_updated'));
        }

        return response()->json(['message' => 'Usuario aprobado.', 'user' => $user]);
    }

    public function rejectUser(Request $request, User $user): JsonResponse
    {
        $authUser = $request->user();
        if (! $authUser->isSuperAdmin() && $user->admin_id !== $authUser->id) {
            return response()->json(['message' => 'No tienes permisos para rechazar este usuario.'], 403);
        }

        if ($user->status !== 'pending_approval') {
            return response()->json(['message' => 'El usuario no está pendiente de aprobación.'], 400);
        }

        $user->update(['status' => 'rejected']);

        return response()->json(['message' => 'Usuario rechazado.', 'user' => $user]);
    }

    public function pendingOrders(Request $request): JsonResponse
    {
        $this->releaseExpiredPendingOrders();

        $query = Order::where('status', 'pending_admin')
            ->with('user', 'raffle', 'tickets')
            ->orderBy('confirmed_at', 'asc');

        $this->applyOrderScope($query, $request->user());

        $orders = $query->get()->map(function ($order) {
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

    public function approveOrder(Request $request, Order $order): JsonResponse
    {
        $authUser = $request->user();
        if (! $authUser->isSuperAdmin()) {
            $belongsToAdmin = $order->raffle && $order->raffle->admin_id === $authUser->id
                || $order->user && $order->user->admin_id === $authUser->id;
            if (! $belongsToAdmin) {
                return response()->json(['message' => 'No tienes permisos para aprobar esta orden.'], 403);
            }
        }

        if ($order->status !== 'pending_admin') {
            return response()->json(['message' => 'La orden no está pendiente de validación.'], 400);
        }

        return DB::transaction(function () use ($order) {
            $order->update(['status' => 'sold']);
            $order->tickets()->update(['status' => 'sold']);

            $freshOrder = $order->fresh()->load('tickets');
            broadcast(new OrderStatusChanged($freshOrder, $freshOrder->user_id));
            foreach ($freshOrder->tickets as $ticket) {
                $ticket->load('user:id,name,avatar');
                broadcast(new TicketStatusChanged($ticket, $freshOrder->raffle_id));
            }

            if ($freshOrder->raffle?->admin_id) {
                broadcast(new AdminNotification($freshOrder->raffle->admin_id, 'new_pending_order', [
                    'order_id' => $freshOrder->id,
                    'status' => $freshOrder->status,
                ]));
            }

            return response()->json([
                'message' => 'Apuesta aceptada. Números vendidos.',
                'order' => $freshOrder,
            ]);
        });
    }

    public function rejectOrder(Request $request, Order $order): JsonResponse
    {
        $authUser = $request->user();
        if (! $authUser->isSuperAdmin()) {
            $belongsToAdmin = $order->raffle && $order->raffle->admin_id === $authUser->id
                || $order->user && $order->user->admin_id === $authUser->id;
            if (! $belongsToAdmin) {
                return response()->json(['message' => 'No tienes permisos para rechazar esta orden.'], 403);
            }
        }

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

            $freshOrder = $order->fresh();
            broadcast(new OrderStatusChanged($freshOrder, $freshOrder->user_id));
            foreach ($freshOrder->tickets as $ticket) {
                broadcast(new TicketStatusChanged($ticket, $freshOrder->raffle_id));
            }

            if ($freshOrder->raffle?->admin_id) {
                broadcast(new AdminNotification($freshOrder->raffle->admin_id, 'new_pending_order', [
                    'order_id' => $freshOrder->id,
                    'status' => $freshOrder->status,
                ]));
            }

            return response()->json([
                'message' => 'Apuesta rechazada. Números liberados.',
                'order' => $freshOrder,
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
                $tickets = $order->tickets()->get();
                $order->tickets()->update([
                    'status' => 'available',
                    'order_id' => null,
                    'user_id' => null,
                    'reserved_at' => null,
                ]);
                $order->update(['status' => 'expired']);

                foreach ($tickets as $ticket) {
                    $ticket->status = 'available';
                    $ticket->user_id = null;
                    $ticket->reserved_at = null;
                    broadcast(new TicketStatusChanged($ticket, $order->raffle_id));
                }
            });
        }

        $expiredCarts = Order::where('status', 'in_cart')
            ->whereHas('tickets')
            ->with('raffle')
            ->get()
            ->filter(function ($order) {
                $expiryMinutes = $order->raffle?->cart_expiry_minutes ?? 10;
                $firstTicket = $order->tickets()->orderBy('reserved_at')->first(['reserved_at']);

                return $firstTicket && $firstTicket->reserved_at <= now()->subMinutes($expiryMinutes);
            });

        foreach ($expiredCarts as $order) {
            DB::transaction(function () use ($order) {
                $tickets = $order->tickets()->get();
                $order->tickets()->update([
                    'status' => 'available',
                    'order_id' => null,
                    'user_id' => null,
                    'reserved_at' => null,
                ]);
                $order->update(['status' => 'expired']);

                foreach ($tickets as $ticket) {
                    $ticket->status = 'available';
                    $ticket->user_id = null;
                    $ticket->reserved_at = null;
                    broadcast(new TicketStatusChanged($ticket, $order->raffle_id));
                }
            });
        }
    }

    public function allOrders(Request $request): JsonResponse
    {
        $this->releaseExpiredPendingOrders();

        $query = Order::query()->with('user', 'raffle', 'tickets');
        $this->applyOrderScope($query, $request->user());

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
        } elseif ($status === 'expired') {
            $query->where('status', 'expired')->whereNotNull('confirmed_at');
        } elseif ($status !== 'all') {
            $query->where('status', $status);
        } else {
            $query->where(function ($q) {
                $q->where('status', '!=', 'expired')
                    ->orWhere(function ($q2) {
                        $q2->where('status', 'expired')->whereNotNull('confirmed_at');
                    });
            });
        }

        $perPage = (int) $request->input('per_page', 10);
        if (! in_array($perPage, [5, 10, 20, 30, 50, 100], true)) {
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
        $this->applyUserScope($query, $request->user());

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
        if (! in_array($perPage, [5, 10, 20, 30, 50, 100], true)) {
            $perPage = 10;
        }

        $users = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($users);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $authUser = $request->user();
        if (! $authUser->isSuperAdmin() && $user->admin_id !== $authUser->id) {
            return response()->json(['message' => 'No tienes permisos para modificar este usuario.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,'.$user->id,
            'whatsapp' => 'nullable|string|max:20',
            'avatar' => 'nullable|string|max:255',
            'status' => 'sometimes|in:pending_approval,approved,rejected,blocked',
            'role' => 'sometimes|in:user,super_admin',
        ]);

        $user->update($validated);

        return response()->json(['message' => 'Perfil actualizado.', 'user' => $user->fresh()]);
    }

    public function blockUser(Request $request, User $user): JsonResponse
    {
        $authUser = $request->user();
        if (! $authUser->isSuperAdmin() && $user->admin_id !== $authUser->id) {
            return response()->json(['message' => 'No tienes permisos para bloquear este usuario.'], 403);
        }

        $user->update(['status' => 'blocked']);

        return response()->json(['message' => 'Usuario bloqueado.', 'user' => $user->fresh()]);
    }

    public function unblockUser(Request $request, User $user): JsonResponse
    {
        $authUser = $request->user();
        if (! $authUser->isSuperAdmin() && $user->admin_id !== $authUser->id) {
            return response()->json(['message' => 'No tienes permisos para desbloquear este usuario.'], 403);
        }

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

    public function generateInvite(Request $request): JsonResponse
    {
        $admin = $request->user();

        AdminInvite::where('admin_id', $admin->id)->whereNull('expires_at')->orWhere(function ($q) use ($admin) {
            $q->where('admin_id', $admin->id)->where('expires_at', '>', now());
        })->delete();

        $token = Str::random(64);
        $invite = AdminInvite::create([
            'admin_id' => $admin->id,
            'token' => $token,
            'expires_at' => now()->addDays(7),
        ]);

        $frontendUrl = env('FRONTEND_URL', 'http://127.0.0.1:3333');
        $url = rtrim($frontendUrl, '/').'/register?invite_token='.$token;

        return response()->json([
            'url' => $url,
            'token' => $token,
            'expires_at' => $invite->expires_at,
        ]);
    }

    public function latestInvite(Request $request): JsonResponse
    {
        $invite = AdminInvite::where('admin_id', $request->user()->id)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->latest()
            ->first();

        if (! $invite) {
            return response()->json(['url' => null]);
        }

        $frontendUrl = env('FRONTEND_URL', 'http://127.0.0.1:3333');
        $url = rtrim($frontendUrl, '/').'/register?invite_token='.$invite->token;

        return response()->json([
            'url' => $url,
            'token' => $invite->token,
            'expires_at' => $invite->expires_at,
        ]);
    }
}
