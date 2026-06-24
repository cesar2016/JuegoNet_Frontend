<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Raffle;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RaffleController extends Controller
{
    public function index(): JsonResponse
    {
        Raffle::where('is_active', true)
            ->where(function ($q) {
                $q->where('end_time', '<=', now())
                  ->orWhereNotNull('drawn_at');
            })
            ->update(['is_active' => false]);

        $raffles = Raffle::where('is_active', true)
            ->orderBy('end_time', 'desc')
            ->get();

        return response()->json($raffles);
    }

    public function finished(Request $request): JsonResponse
    {
        $from = $request->input('from', now()->subHours(48));
        $to = $request->input('to', now());

        $raffles = Raffle::whereNotNull('drawn_at')
            ->where('drawn_at', '>=', $from)
            ->where('drawn_at', '<=', $to)
            ->orderBy('drawn_at', 'desc')
            ->get();

        return response()->json($raffles);
    }

    public function active(): JsonResponse
    {
        $now = now();
        $raffle = Raffle::where('is_active', true)
            ->where('start_time', '<=', $now)
            ->where('end_time', '>=', $now)
            ->first();

        if (!$raffle) {
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
        ]);

        if (!($validated['start_time'] ?? null)) {
            $validated['start_time'] = now();
            $validated['end_time'] = now()->addHours((int) ($validated['duration_hours'] ?? 1));
        }

        $validated['prizes_count'] ??= 1;
        unset($validated['duration_hours']);

        $raffle = DB::transaction(function () use ($validated) {
            $raffle = Raffle::create([
                ...$validated,
                'is_active' => false,
            ]);

            for ($i = 1; $i <= 99; $i++) {
                Ticket::create([
                    'raffle_id' => $raffle->id,
                    'number' => $i,
                    'status' => 'available',
                ]);
            }

            return $raffle;
        });

        return response()->json($raffle, 201);
    }

    public function show(Raffle $raffle): JsonResponse
    {
        return response()->json($raffle);
    }

    public function all(): JsonResponse
    {
        $raffles = Raffle::orderBy('created_at', 'desc')->get()->map(function (Raffle $r) {
            $hasBets = $r->tickets()->whereIn('status', ['in_cart', 'pending_admin', 'sold'])->exists();
            $canEdit = now()->lessThan($r->start_time) && !$hasBets;
            return [
                'id' => $r->id,
                'name' => $r->name,
                'start_time' => $r->start_time,
                'end_time' => $r->end_time,
                'ticket_price' => $r->ticket_price,
                'prizes_count' => $r->prizes_count,
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

    public function toggleActive(Raffle $raffle): JsonResponse
    {
        $activating = !$raffle->is_active;

        if ($activating && !$raffle->drawn_at) {
            $activeCount = Raffle::where('is_active', true)->where('id', '!=', $raffle->id)->count();
            if ($activeCount >= 5) {
                return response()->json(['message' => 'No se pueden activar más de 5 sorteos en simultáneo.'], 422);
            }
        }

        $raffle->update(['is_active' => !$raffle->is_active]);
        return response()->json(['message' => 'Estado actualizado.', 'raffle' => $raffle->fresh()]);
    }

    public function update(Request $request, Raffle $raffle): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'start_time' => 'sometimes|date',
            'end_time' => 'sometimes|date|after:start_time',
            'ticket_price' => 'sometimes|numeric|min:0',
            'prizes_count' => 'nullable|integer|min:1|max:10',
            'is_active' => 'sometimes|boolean',
        ]);

        if (!$this->isEditable($raffle)) {
            return response()->json(['message' => 'No se puede modificar un sorteo que ya comenzó o tiene apuestas.'], 422);
        }

        if (($validated['is_active'] ?? null) === true && !$raffle->is_active && !$raffle->drawn_at) {
            $activeCount = Raffle::where('is_active', true)->where('id', '!=', $raffle->id)->count();
            if ($activeCount >= 5) {
                return response()->json(['message' => 'No se pueden activar más de 5 sorteos en simultáneo.'], 422);
            }
        }

        $raffle->update($validated);

        return response()->json($raffle);
    }

    public function destroy(Raffle $raffle): JsonResponse
    {
        if (!$this->isEditable($raffle)) {
            return response()->json(['message' => 'No se puede eliminar un sorteo que ya comenzó o tiene apuestas.'], 422);
        }

        $raffle->tickets()->delete();
        $raffle->orders()->delete();
        $raffle->delete();

        return response()->json(['message' => 'Sorteo eliminado correctamente.']);
    }

    private function isEditable(Raffle $raffle): bool
    {
        if (now()->greaterThanOrEqualTo($raffle->start_time)) {
            return false;
        }

        return !$this->hasBets($raffle);
    }

    private function hasBets(Raffle $raffle): bool
    {
        return $raffle->tickets()
            ->whereIn('status', ['in_cart', 'pending_admin', 'sold'])
            ->exists();
    }

    public function setResults(Request $request, Raffle $raffle): JsonResponse
    {
        $validated = $request->validate([
            'winning_numbers' => 'required|array|min:1|max:10',
            'winning_numbers.*' => 'required|integer|min:1|max:99|distinct',
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

        return response()->json([
            'message' => 'Resultados declarados.',
            'raffle' => $raffle->fresh(),
            'winners' => $winners,
        ]);
    }

    public function results(Raffle $raffle): JsonResponse
    {
        if (!$raffle->winning_numbers) {
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

    public function board(Raffle $raffle): JsonResponse
    {
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

    public function participants(Raffle $raffle): JsonResponse
    {
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
                'tickets' => $userTickets->map(fn($t) => [
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

        $raffle->tickets()
            ->where('status', 'in_cart')
            ->where('reserved_at', '<=', $now->copy()->subMinutes(10))
            ->update([
                'status' => 'available',
                'order_id' => null,
                'user_id' => null,
                'reserved_at' => null,
            ]);

        $expiredPendingOrders = $raffle->orders()
            ->where('status', 'pending_admin')
            ->where('confirmed_at', '<=', $now->copy()->subMinutes(15))
            ->get();

        foreach ($expiredPendingOrders as $order) {
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
}
