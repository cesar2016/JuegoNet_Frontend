<?php

namespace App\Http\Controllers\Api;

use App\Events\AdminNotification;
use App\Events\OrderStatusChanged;
use App\Events\TicketStatusChanged;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Raffle;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{
    public function cart(Request $request): JsonResponse
    {
        $user = $request->user();
        $raffleId = $request->input('raffle_id');

        $query = Order::where('user_id', $user->id)
            ->where('status', 'in_cart')
            ->with('tickets', 'raffle');

        if ($raffleId) {
            $query->where('raffle_id', $raffleId);
        }

        $cart = $query->first();

        if (! $cart) {
            return response()->json(['cart' => null]);
        }

        $this->checkCartExpiration($cart);

        if ($cart->status !== 'in_cart') {
            return response()->json(['cart' => null]);
        }

        $now = now();
        $expiryMinutes = $cart->raffle?->cart_expiry_minutes ?? 10;
        $reservedAt = $cart->tickets->min('reserved_at');
        $expiresAt = $reservedAt ? $reservedAt->copy()->addMinutes($expiryMinutes) : null;
        $remaining = $expiresAt && $now->lt($expiresAt)
            ? $now->diffInSeconds($expiresAt, false)
            : 0;

        return response()->json([
            'cart' => $cart,
            'remaining_seconds' => max(0, $remaining),
        ]);
    }

    public function addTicket(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'raffle_id' => 'required|exists:raffles,id',
            'number' => 'required|integer|min:0|max:99',
        ]);

        $raffle = Raffle::findOrFail($validated['raffle_id']);

        if (! $raffle->is_active || now()->gt($raffle->end_time)) {
            return response()->json(['message' => 'El sorteo no está activo.'], 400);
        }

        $user = $request->user();

        if ($user->isAdmin()) {
            return response()->json(['message' => 'Los administradores no pueden comprar números.'], 403);
        }

        if ($user->admin_id && $raffle->admin_id !== $user->admin_id) {
            return response()->json(['message' => 'No tienes permisos para participar en este sorteo.'], 403);
        }

        $participatingRaffles = Order::where('user_id', $user->id)
            ->whereIn('status', ['in_cart', 'pending_admin', 'sold'])
            ->pluck('raffle_id')
            ->unique();

        $alreadyInThisOne = $participatingRaffles->contains($raffle->id);
        if (! $alreadyInThisOne && $participatingRaffles->count() >= 5) {
            return response()->json(['message' => 'Ya participás en 5 sorteos en simultáneo. No podés sumar uno nuevo.'], 422);
        }

        return DB::transaction(function () use ($validated, $raffle, $user) {
            $ticket = Ticket::where('raffle_id', $raffle->id)
                ->where('number', $validated['number'])
                ->lockForUpdate()
                ->first();

            if (! $ticket || $ticket->status !== 'available') {
                return response()->json([
                    'message' => 'El número no está disponible.',
                ], 409);
            }

            $cart = Order::where('user_id', $user->id)
                ->where('raffle_id', $raffle->id)
                ->where('status', 'in_cart')
                ->first();

            if (! $cart) {
                $cart = Order::create([
                    'user_id' => $user->id,
                    'raffle_id' => $raffle->id,
                    'total_price' => 0,
                    'status' => 'in_cart',
                ]);
            }

            $this->checkCartExpiration($cart);

            if ($cart->status !== 'in_cart') {
                return response()->json(['message' => 'El carrito ha expirado. Intenta de nuevo.'], 400);
            }

            $ticket->update([
                'status' => 'in_cart',
                'order_id' => $cart->id,
                'user_id' => $user->id,
                'reserved_at' => now(),
            ]);

            $cart->increment('total_price', $raffle->ticket_price);

            $ticket->load('user:id,name,avatar');

            try {
                broadcast(new TicketStatusChanged($ticket, $raffle->id));
            } catch (\Throwable $e) {
                Log::error('Broadcast TicketStatusChanged failed', ['error' => $e->getMessage()]);
            }

            $ticketCount = $cart->tickets()->count();

            if ($raffle->admin_id) {
                $this->broadcastToAdminAndSuperAdmins($raffle->admin_id, 'new_pending_order', [
                    'order_id' => $cart->id,
                    'total_price' => $cart->total_price,
                    'tickets_count' => $ticketCount,
                ]);
            }

            $expiresAt = now()->addMinutes($raffle->cart_expiry_minutes ?? 10);

            return response()->json([
                'message' => 'Número agregado al carrito.',
                'ticket' => $ticket,
                'cart' => $cart->fresh()->load('tickets', 'raffle'),
                'remaining_seconds' => now()->diffInSeconds($expiresAt, false),
            ]);
        });
    }

    public function removeTicket(Request $request, Ticket $ticket): JsonResponse
    {
        $user = $request->user();

        if ($ticket->status !== 'in_cart' || ! $ticket->order || $ticket->order->user_id !== $user->id) {
            return response()->json(['message' => 'No puedes eliminar este número.'], 403);
        }

        return DB::transaction(function () use ($ticket) {
            $order = $ticket->order;

            $ticket->update([
                'status' => 'available',
                'order_id' => null,
                'user_id' => null,
                'reserved_at' => null,
            ]);

            $order->decrement('total_price', $order->raffle->ticket_price);

            try {
                broadcast(new TicketStatusChanged($ticket, $order->raffle_id));
            } catch (\Throwable $e) {
                Log::error('Broadcast TicketStatusChanged failed', ['error' => $e->getMessage()]);
            }

            $ticketCount = $order->tickets()->count();

            if ($ticketCount === 0) {
                $order->delete();

                if ($order->raffle->admin_id) {
                    $this->broadcastToAdminAndSuperAdmins($order->raffle->admin_id, 'new_pending_order', [
                        'order_id' => $order->id,
                        'tickets_count' => 0,
                        'deleted' => true,
                    ]);
                }

                return response()->json(['message' => 'Número eliminado. Carrito vacío.'], 200);
            }

            if ($order->raffle->admin_id) {
                $this->broadcastToAdminAndSuperAdmins($order->raffle->admin_id, 'new_pending_order', [
                    'order_id' => $order->id,
                    'total_price' => $order->total_price,
                    'tickets_count' => $ticketCount,
                ]);
            }

            return response()->json([
                'message' => 'Número eliminado del carrito.',
                'cart' => $order->fresh()->load('tickets', 'raffle'),
            ]);
        });
    }

    public function confirm(Request $request): JsonResponse
    {
        $user = $request->user();
        $raffleId = $request->input('raffle_id');

        $query = Order::where('user_id', $user->id)
            ->where('status', 'in_cart')
            ->with('tickets');

        if ($raffleId) {
            $query->where('raffle_id', $raffleId);
        }

        $cart = $query->first();

        if (! $cart || $cart->tickets->isEmpty()) {
            return response()->json(['message' => 'El carrito está vacío.'], 400);
        }

        $this->checkCartExpiration($cart);

        if ($cart->status !== 'in_cart') {
            return response()->json(['message' => 'El carrito ha expirado.'], 400);
        }

        return DB::transaction(function () use ($cart, $user) {
            $raffleId = $cart->raffle_id;
            $now = now();

            $cart->update([
                'status' => 'pending_admin',
                'confirmed_at' => $now,
            ]);

            $cart->tickets()->update(['status' => 'pending_admin']);

            $freshCart = $cart->fresh();
            try {
                broadcast(new OrderStatusChanged($freshCart, $user->id));
            } catch (\Throwable $e) {
                Log::error('Broadcast OrderStatusChanged failed', ['error' => $e->getMessage()]);
            }

            $raffle = Raffle::find($raffleId);
            foreach ($freshCart->tickets as $ticket) {
                $ticket->load('user:id,name,avatar');
                try {
                    broadcast(new TicketStatusChanged($ticket, $raffleId));
                } catch (\Throwable $e) {
                    Log::error('Broadcast TicketStatusChanged failed', ['error' => $e->getMessage()]);
                }
            }

            if ($raffle && $raffle->admin_id) {
                $this->broadcastToAdminAndSuperAdmins($raffle->admin_id, 'new_pending_order', [
                    'order_id' => $freshCart->id,
                    'total_price' => $freshCart->total_price,
                    'tickets_count' => $freshCart->tickets->count(),
                    'status' => $freshCart->status,
                ]);
            }

            return response()->json([
                'message' => 'Compra confirmada. Espera la validación del administrador.',
                'order' => $freshCart->load('tickets'),
            ]);
        });
    }

    public function myOrders(Request $request): JsonResponse
    {
        $orders = Order::where('user_id', $request->user()->id)
            ->with('raffle', 'tickets')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($orders);
    }

    private function checkCartExpiration(Order $cart): void
    {
        if ($cart->status !== 'in_cart') {
            return;
        }

        $firstTicket = $cart->tickets()->orderBy('reserved_at')->first();

        if (! $firstTicket) {
            return;
        }

        $reservedAt = $firstTicket->reserved_at;
        $expiryMinutes = $cart->raffle?->cart_expiry_minutes ?? 10;

        if ($reservedAt && now()->diffInMinutes($reservedAt) >= $expiryMinutes) {
            DB::transaction(function () use ($cart) {
                $tickets = $cart->tickets()->get();
                $cart->tickets()->update([
                    'status' => 'available',
                    'order_id' => null,
                    'user_id' => null,
                    'reserved_at' => null,
                ]);
                $cart->update(['status' => 'expired']);

                foreach ($tickets as $ticket) {
                    $ticket->status = 'available';
                    $ticket->user_id = null;
                    $ticket->reserved_at = null;
                    try {
                        broadcast(new TicketStatusChanged($ticket, $cart->raffle_id));
                    } catch (\Throwable $e) {
                        Log::error('Broadcast failed during cart expiration', [
                            'ticket_id' => $ticket->id,
                            'cart_id' => $cart->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });
        }
    }
}
