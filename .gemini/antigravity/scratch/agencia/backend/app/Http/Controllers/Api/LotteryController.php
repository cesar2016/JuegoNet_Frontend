<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LotteryResource;
use App\Models\Lottery;
use Illuminate\Http\JsonResponse;

class LotteryController extends Controller
{
    public function index(): JsonResponse
    {
        $lotteries = Lottery::where('is_active', true)
            ->with('schedules.draw')
            ->get();

        return response()->json(LotteryResource::collection($lotteries));
    }

    public function show(Lottery $lottery): JsonResponse
    {
        $lottery->load('schedules.draw');

        return response()->json(new LotteryResource($lottery));
    }
}
