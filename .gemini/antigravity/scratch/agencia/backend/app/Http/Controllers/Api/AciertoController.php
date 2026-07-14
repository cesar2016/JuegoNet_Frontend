<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DrawResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AciertoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $results = DrawResult::with([
            'extract.lottery',
            'extract.draw',
            'bet.user',
            'betItem',
            'redoblona',
        ])
            ->when($request->date, fn($q, $v) => $q->whereHas('extract', fn($q) => $q->where('draw_date', $v)))
            ->when($request->draw_id, fn($q, $v) => $q->whereHas('extract', fn($q) => $q->where('draw_id', $v)))
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy(fn($r) => $r->extract?->draw?->name ?? 'Sin sorteo');

        return response()->json($results);
    }
}
