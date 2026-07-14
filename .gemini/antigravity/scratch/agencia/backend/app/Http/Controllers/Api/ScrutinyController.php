<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DrawResultResource;
use App\Models\Extract;
use App\Services\ScrutinyService;
use Illuminate\Http\JsonResponse;

class ScrutinyController extends Controller
{
    public function __construct(
        private readonly ScrutinyService $scrutinyService
    ) {}

    public function run(Extract $extract): JsonResponse
    {
        if ($extract->status === 'completed') {
            return response()->json(['message' => 'Este extracto ya fue procesado.'], 409);
        }

        $this->scrutinyService->run($extract);

        $extract->load('drawResults.bet.user', 'drawResults.betItem', 'drawResults.redoblona');

        return response()->json([
            'message' => 'Escrutinio completado exitosamente.',
            'results' => DrawResultResource::collection($extract->drawResults),
        ]);
    }
}
