<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bet;
use App\Models\DrawResult;
use App\Models\Extract;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function cashRegister(Request $request): JsonResponse
    {
        $date = $request->date ?? now()->format('Y-m-d');

        $totalBets = Bet::where('draw_date', $date)->sum('total');
        $totalPrizes = DrawResult::whereHas('extract', fn($q) => $q->where('draw_date', $date))
            ->where('status', 'pending')
            ->sum('prize_amount');

        return response()->json([
            'date'          => $date,
            'total_recaudado' => $totalBets - $totalPrizes,
            'total_apuestas'  => $totalBets,
            'total_premios'   => $totalPrizes,
        ]);
    }

    public function stats(Request $request): JsonResponse
    {
        $date = $request->date ?? now()->format('Y-m-d');

        return response()->json([
            'bets_count'     => Bet::where('draw_date', $date)->count(),
            'extracts_count' => Extract::where('draw_date', $date)->count(),
            'total_bets'     => Bet::where('draw_date', $date)->sum('total'),
            'active_users'   => Bet::where('draw_date', $date)->distinct('user_id')->count('user_id'),
            'aciertos_count' => DrawResult::whereHas('extract', fn($q) => $q->where('draw_date', $date))->count(),
        ]);
    }
}
