<?php

namespace App\Http\Controllers\Api;

use App\Events\AdminNotification;
use App\Events\TicketStatusChanged;
use App\Http\Controllers\Controller;
use App\Models\Raffle;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RaffleController extends Controller
{
    private function scopeForUser($query, Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return $query;
        }

        if ($user->isAdmin() && ! $user->isSuperAdmin()) {
            $query->where('admin_id', $user->id);
        } elseif ($user->admin_id) {
            $query->where('admin_id', $user->admin_id);
        }

        return $query;
    }

    public function index(Request $request): JsonResponse
    {
        Raffle::where('is_active', true)
            ->where(function ($q) {
                $q->where('end_time', '<=', now())
                    ->orWhereNotNull('drawn_at');
            })
            ->update(['is_active' => false]);

        $query = Raffle::where('is_active', true);
        $this->scopeForUser($query, $request);

        $raffles = $query->orderBy('end_time', 'desc')->get();

        return response()->json($raffles);
    }

    public function finished(Request $request): JsonResponse
    {
        $from = $request->input('from', now()->subHours(48));
        $to = $request->input('to', now());

        $query = Raffle::whereNotNull('drawn_at')
            ->where('drawn_at', '>=', $from)
            ->where('drawn_at', '<=', $to);
        $this->scopeForUser($query, $request);

        $raffles = $query->orderBy('drawn_at', 'desc')->get();

        return response()->json($raffles);
    }

    public function active(Request $request): JsonResponse
    {
        $now = now();

        $query = Raffle::where('is_active', true)
            ->where('start_time', '<=', $now)
            ->where('end_time', '>=', $now);
        $this->scopeForUser($query, $request);

        $raffle = $query->first();

        if (! $raffle) {
            return response()->json(['message' => 'No hay sorteos activos.'], 404);
        }

        return response()->json($raffle);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date',
            'duration_hours' => 'nullable|numeric|min:1',
            'ticket_price' => 'required|numeric|min:0',
            'prizes_count' => 'nullable|integer|min:1|max:10',
            'cart_expiry_minutes' => 'nullable|integer|min:1|max:120',
        ]);

        if (! ($validated['start_time'] ?? null)) {
            $validated['start_time'] = now();
            $validated['end_time'] = now()->addHours((int) ($validated['duration_hours'] ?? 1));
        }

        $validated['prizes_count'] ??= 1;
        unset($validated['duration_hours']);

        $raffle = DB::transaction(function () use ($validated, $request) {
            $raffle = Raffle::create([
                ...$validated,
                'is_active' => true,
                'admin_id' => $request->user()->id,
            ]);

            for ($i = 0; $i <= 99; $i++) {
                Ticket::create([
                    'raffle_id' => $raffle->id,
                    'number' => $i,
                    'status' => 'available',
                ]);
            }

            return $raffle;
        });

        broadcast(new AdminNotification($request->user()->id, 'raffle_list_updated'));

        return response()->json($raffle, 201);
    }

    public function show(Request $request, Raffle $raffle): JsonResponse
    {
        $this->authorizeRaffleForUser($request, $raffle);

        return response()->json($raffle);
    }

    public function board(Request $request, Raffle $raffle): JsonResponse
    {
        $this->authorizeRaffleForUser($request, $raffle);
        $this->releaseExpiredTickets($raffle);

        $tickets = $raffle->tickets()
            ->with('user:id,name,avatar')
            ->orderBy('number')
            ->get()
            ->map(function ($ticket) {
                return [
                    'id' => $ticket->id,
                    'number' => $ticket->number,
                    'status' => $ticket->status,
                    'user_id' => $ticket->user_id,
                    'user' => $ticket->user ? [
                        'name' => $ticket->user->name,
                        'avatar' => $ticket->user->avatar,
                    ] : null,
                    'reserved_at' => $ticket->reserved_at,
                ];
            });

        return response()->json([
            'raffle' => $raffle,
            'tickets' => $tickets,
        ]);
    }

    public function results(Request $request, Raffle $raffle): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->isAdmin() && ! $user->isSuperAdmin() && $raffle->admin_id !== $user->id) {
            return response()->json(['message' => 'No tienes permisos para ver los resultados de este sorteo.'], 403);
        }

        if (! $raffle->winning_numbers) {
            return response()->json(['message' => 'Este sorteo aún no tiene resultados.'], 404);
        }

        $tickets = $raffle->tickets()
            ->with('user:id,name,email,avatar,whatsapp')
            ->whereIn('status', ['sold'])
            ->get()
            ->keyBy('number');

        $winners = [];
        foreach ($raffle->winning_numbers as $position => $number) {
            $ticket = $tickets->get($number);
            $winners[] = [
                'position' => $position + 1,
                'number' => $number,
                'user' => $ticket?->user ? [
                    'id' => $ticket->user->id,
                    'name' => $ticket->user->name,
                    'email' => $ticket->user->email,
                    'avatar' => $ticket->user->avatar,
                    'whatsapp' => $ticket->user->whatsapp,
                ] : null,
            ];
        }

        return response()->json([
            'raffle' => $raffle,
            'winners' => $winners,
        ]);
    }

    private function authorizeRaffle(Request $request, Raffle $raffle): void
    {
        $user = $request->user();
        if ($user->isAdmin() && ! $user->isSuperAdmin() && $raffle->admin_id !== $user->id) {
            abort(403, 'No tienes permisos para gestionar este sorteo.');
        }
    }

    private function authorizeRaffleForUser(Request $request, Raffle $raffle): void
    {
        $user = $request->user();
        if (! $user) {
            return;
        }

        $allowedAdminId = null;
        if ($user->isAdmin() && ! $user->isSuperAdmin()) {
            $allowedAdminId = $user->id;
        } elseif ($user->admin_id) {
            $allowedAdminId = $user->admin_id;
        }

        if ($allowedAdminId && $raffle->admin_id !== $allowedAdminId) {
            abort(403, 'No tienes permisos para ver este sorteo.');
        }
    }

    public function all(Request $request): JsonResponse
    {
        $query = Raffle::orderBy('created_at', 'desc');
        $user = $request->user();
        if ($user && $user->isAdmin() && ! $user->isSuperAdmin()) {
            $query->where('admin_id', $user->id);
        }
        $raffles = $query->get()->map(function (Raffle $r) {
            $hasBets = $r->tickets()->whereIn('status', ['in_cart', 'pending_admin', 'sold'])->exists();
            $canEdit = now()->lessThan($r->start_time) && ! $hasBets;

            return [
                'id' => $r->id,
                'name' => $r->name,
                'start_time' => $r->start_time,
                'end_time' => $r->end_time,
                'ticket_price' => $r->ticket_price,
                'prizes_count' => $r->prizes_count,
                'cart_expiry_minutes' => $r->cart_expiry_minutes,
                'winning_numbers' => $r->winning_numbers,
                'drawn_at' => $r->drawn_at,
                'is_active' => $r->is_active,
                'created_at' => $r->created_at,
                'updated_at' => $r->updated_at,
                'can_edit' => $canEdit,
            ];
        });

        return response()->json($raffles);
    }

    public function toggleActive(Request $request, Raffle $raffle): JsonResponse
    {
        $this->authorizeRaffle($request, $raffle);
        $activating = ! $raffle->is_active;

        if ($activating && ! $raffle->drawn_at) {
            $activeCount = Raffle::where('is_active', true)->where('id', '!=', $raffle->id)->count();
            if ($activeCount >= 5) {
                return response()->json(['message' => 'No se pueden activar más de 5 sorteos en simultáneo.'], 422);
            }
        }

        $raffle->update(['is_active' => ! $raffle->is_active]);

        broadcast(new AdminNotification($request->user()->id, 'raffle_list_updated'));

        return response()->json(['message' => 'Estado actualizado.', 'raffle' => $raffle->fresh()]);
    }

    public function update(Request $request, Raffle $raffle): JsonResponse
    {
        $this->authorizeRaffle($request, $raffle);
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'start_time' => 'sometimes|date',
            'end_time' => 'sometimes|date|after:start_time',
            'ticket_price' => 'sometimes|numeric|min:0',
            'prizes_count' => 'nullable|integer|min:1|max:10',
            'cart_expiry_minutes' => 'nullable|integer|min:1|max:120',
            'is_active' => 'sometimes|boolean',
        ]);

        if (! $this->isEditable($raffle)) {
            return response()->json(['message' => 'No se puede modificar un sorteo que ya comenzó o tiene apuestas.'], 422);
        }

        if (($validated['is_active'] ?? null) === true && ! $raffle->is_active && ! $raffle->drawn_at) {
            $activeCount = Raffle::where('is_active', true)->where('id', '!=', $raffle->id)->count();
            if ($activeCount >= 5) {
                return response()->json(['message' => 'No se pueden activar más de 5 sorteos en simultáneo.'], 422);
            }
        }

        $raffle->update($validated);

        return response()->json($raffle);
    }

    public function destroy(Request $request, Raffle $raffle): JsonResponse
    {
        $this->authorizeRaffle($request, $raffle);
        if (! $this->isEditable($raffle)) {
            return response()->json(['message' => 'No se puede eliminar un sorteo que ya comenzó o tiene apuestas.'], 422);
        }

        $raffle->tickets()->delete();
        $raffle->orders()->delete();
        $raffle->delete();

        return response()->json(['message' => 'Sorteo eliminado correctamente.']);
    }

    private function isEditable(Raffle $raffle): bool
    {
        $now = now();
        $start = $raffle->start_time;

        \Illuminate\Support\Facades\Log::debug('[isEditable]', [
            'raffle' => $raffle->id,
            'now' => $now->toIso8601String(),
            'start_time' => $start?->toIso8601String(),
            'now_timestamp' => $now->timestamp,
            'start_timestamp' => $start?->timestamp,
            'now_tz' => $now->timezoneName,
            'start_tz' => $start?->timezoneName,
            'passed' => $now->greaterThanOrEqualTo($start),
        ]);

        if ($now->greaterThanOrEqualTo($start)) {
            return false;
        }

        return ! $this->hasBets($raffle);
    }

    private function hasBets(Raffle $raffle): bool
    {
        return $raffle->tickets()
            ->whereIn('status', ['in_cart', 'pending_admin', 'sold'])
            ->exists();
    }

    public function setResults(Request $request, Raffle $raffle): JsonResponse
    {
        $this->authorizeRaffle($request, $raffle);
        $validated = $request->validate([
            'winning_numbers' => 'required|array|min:1|max:10',
            'winning_numbers.*' => 'required|integer|min:0|max:99|distinct',
        ]);

        if (count($validated['winning_numbers']) > $raffle->prizes_count) {
            return response()->json(['message' => 'No pueden haber más números ganadores que premios configurados.'], 422);
        }

        $tickets = $raffle->tickets()
            ->with('user:id,name,email,avatar,whatsapp')
            ->whereIn('status', ['sold'])
            ->get()
            ->keyBy('number');

        $winners = [];
        foreach ($validated['winning_numbers'] as $position => $number) {
            $ticket = $tickets->get($number);
            $winners[] = [
                'position' => $position + 1,
                'number' => $number,
                'user' => $ticket?->user ? [
                    'id' => $ticket->user->id,
                    'name' => $ticket->user->name,
                    'email' => $ticket->user->email,
                    'avatar' => $ticket->user->avatar,
                    'whatsapp' => $ticket->user->whatsapp,
                ] : null,
            ];
        }

        $raffle->update([
            'winning_numbers' => $validated['winning_numbers'],
            'drawn_at' => now(),
            'is_active' => false,
        ]);

        broadcast(new AdminNotification($raffle->admin_id, 'raffle_list_updated'));

        return response()->json([
            'message' => 'Resultados declarados.',
            'raffle' => $raffle->fresh(),
            'winners' => $winners,
        ]);
    }

    public function participants(Request $request, Raffle $raffle): JsonResponse
    {
        $this->authorizeRaffle($request, $raffle);
        $tickets = $raffle->tickets()
            ->with('user:id,name,email,avatar,whatsapp')
            ->whereIn('status', ['sold', 'pending_admin', 'in_cart'])
            ->whereNotNull('user_id')
            ->orderBy('number')
            ->get();

        $participants = $tickets->groupBy('user_id')->map(function ($userTickets, $userId) {
            $first = $userTickets->first();

            return [
                'user' => $first->user,
                'tickets' => $userTickets->map(fn ($t) => [
                    'id' => $t->id,
                    'number' => $t->number,
                    'status' => $t->status,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'raffle' => $raffle,
            'participants' => $participants,
        ]);
    }

    private function releaseExpiredTickets(Raffle $raffle): void
    {
        $now = now();
        $expiryMinutes = $raffle->cart_expiry_minutes ?? 10;

        // Find in_cart orders whose earliest ticket has expired
        $expiredOrders = $raffle->orders()
            ->where('status', 'in_cart')
            ->whereHas('tickets', function ($q) use ($now, $expiryMinutes) {
                $q->where('reserved_at', '<=', $now->copy()->subMinutes($expiryMinutes));
            })
            ->get();

        foreach ($expiredOrders as $order) {
            DB::transaction(function () use ($order, $raffle) {
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
                    try {
                        broadcast(new TicketStatusChanged($ticket, $raffle->id));
                    } catch (\Throwable $e) {
                        Log::error('Broadcast failed for expired cart ticket', [
                            'ticket_id' => $ticket->id,
                            'order_id' => $order->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });
        }

        $expiredPendingOrders = $raffle->orders()
            ->where('status', 'pending_admin')
            ->where('confirmed_at', '<=', $now->copy()->subMinutes(15))
            ->get();

        foreach ($expiredPendingOrders as $order) {
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
                    try {
                        broadcast(new TicketStatusChanged($ticket, $order->raffle_id));
                    } catch (\Throwable $e) {
                        Log::error('Broadcast failed for expired pending ticket', [
                            'ticket_id' => $ticket->id,
                            'order_id' => $order->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });
        }
        // Clean up orphaned tickets (in_cart but order is expired/rejected — from previous bugs)
        $orphanedTickets = $raffle->tickets()
            ->where('status', 'in_cart')
            ->whereNotNull('order_id')
            ->whereHas('order', function ($q) {
                $q->whereIn('status', ['expired', 'rejected']);
            })
            ->get();

        foreach ($orphanedTickets as $ticket) {
            $ticket->update([
                'status' => 'available',
                'order_id' => null,
                'user_id' => null,
                'reserved_at' => null,
            ]);
            $ticket->status = 'available';
            $ticket->user_id = null;
            $ticket->reserved_at = null;
            try {
                broadcast(new TicketStatusChanged($ticket, $raffle->id));
            } catch (\Throwable $e) {
                Log::error('Broadcast failed for orphaned ticket', [
                    'ticket_id' => $ticket->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
