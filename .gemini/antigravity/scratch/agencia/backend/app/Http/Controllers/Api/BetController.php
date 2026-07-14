<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBetRequest;
use App\Http\Resources\BetResource;
use App\Models\Bet;
use App\Models\BetItem;
use App\Models\Redoblona;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Bet::with(['user', 'draw', 'lotteries', 'items', 'redoblonas'])
            ->when($request->user()->hasRole('usuario'), fn($q) => $q->where('user_id', $request->user()->id))
            ->when($request->date, fn($q, $v) => $q->where('draw_date', $v))
            ->when($request->date_from, fn($q, $v) => $q->whereDate('draw_date', '>=', $v))
            ->when($request->date_to, fn($q, $v) => $q->whereDate('draw_date', '<=', $v))
            ->when($request->draw_ids, fn($q, $v) => $q->whereIn('draw_id', is_array($v) ? $v : [$v]))
            ->when($request->user_id, fn($q, $v) => $q->where('user_id', $v));

        return response()->json(BetResource::collection($query->latest()->paginate(200)));
    }

    public function destroy(Bet $bet): JsonResponse
    {
        $bet->delete();
        return response()->json(['message' => 'Apuesta eliminada']);
    }

    public function store(StoreBetRequest $request): JsonResponse
    {
        $data = $request->validated();

        $bet = DB::transaction(function () use ($data, $request) {
            $subtotal = collect($data['items'] ?? [])->sum('amount')
                + collect($data['redoblonas'] ?? [])->sum('amount');

            $sequence = now()->format('Ymd') . '-' . str_pad(Bet::max('id') + 1, 5, '0', STR_PAD_LEFT);

            $bet = Bet::create([
                'sequence'  => $sequence,
                'user_id'   => $request->user()->id,
                'draw_id'   => $data['draw_id'],
                'draw_date' => $data['draw_date'],
                'subtotal'  => $subtotal,
                'total'     => $subtotal * count($data['lottery_ids']),
                'status'    => 'active',
            ]);

            $bet->lotteries()->sync($data['lottery_ids']);

            foreach ($data['items'] ?? [] as $item) {
                BetItem::create([
                    'bet_id' => $bet->id,
                    'number' => $item['number'],
                    'type'   => $item['type'],
                    'amount' => $item['amount'],
                ]);
            }

            foreach ($data['redoblonas'] ?? [] as $red) {
                Redoblona::create([
                    'bet_id'        => $bet->id,
                    'first_number'  => $red['first_number'],
                    'second_number' => $red['second_number'],
                    'first_range'   => $red['first_range'],
                    'second_range'  => $red['second_range'],
                    'amount'        => $red['amount'],
                ]);
            }

            return $bet;
        });

        $bet->load(['user', 'draw', 'lotteries', 'items', 'redoblonas']);

        return response()->json(new BetResource($bet), 201);
    }

    public function show(Bet $bet): JsonResponse
    {
        $bet->load(['user', 'draw', 'lotteries', 'items', 'redoblonas']);

        return response()->json(new BetResource($bet));
    }
}
