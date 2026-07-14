<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DrawResource;
use App\Models\Draw;
use Illuminate\Http\JsonResponse;

class DrawController extends Controller
{
    public function index(): JsonResponse
    {
        $draws = Draw::where('is_active', true)->orderBy('order')->get();

        return response()->json(DrawResource::collection($draws));
    }
}
