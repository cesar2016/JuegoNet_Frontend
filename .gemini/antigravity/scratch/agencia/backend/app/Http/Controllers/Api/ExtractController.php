<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreExtractRequest;
use App\Http\Resources\ExtractResource;
use App\Models\Extract;
use App\Models\ExtractNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExtractController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Extract::with(['lottery', 'draw', 'numbers', 'creator'])
            ->when($request->lottery_id, fn($q, $v) => $q->where('lottery_id', $v))
            ->when($request->draw_id, fn($q, $v) => $q->where('draw_id', $v))
            ->when($request->date_from, fn($q, $v) => $q->whereDate('draw_date', '>=', $v))
            ->when($request->date_to, fn($q, $v) => $q->whereDate('draw_date', '<=', $v))
            ->when($request->date, fn($q, $v) => $q->where('draw_date', $v))
            ->when($request->q, fn($q, $v) => $q->where(function ($q) use ($v) {
                $q->whereHas('lottery', fn($q) => $q->where('name', 'like', "%{$v}%")->orWhere('initials', 'like', "%{$v}%"))
                  ->orWhereHas('numbers', fn($q) => $q->where('number', 'like', "%{$v}%"));
            }))
            ->latest();

        return response()->json(ExtractResource::collection($query->paginate(50)));
    }

    public function store(StoreExtractRequest $request): JsonResponse
    {
        $data = $request->validated();

        $extract = DB::transaction(function () use ($data, $request) {
            $extract = Extract::create([
                'lottery_id' => $data['lottery_id'],
                'draw_id'    => $data['draw_id'],
                'draw_date'  => $data['draw_date'],
                'status'     => 'pending',
                'source'     => 'manual',
                'created_by' => $request->user()->id,
            ]);

            foreach ($data['numbers'] as $num) {
                ExtractNumber::create([
                    'extract_id' => $extract->id,
                    'position'   => $num['position'],
                    'number'     => $num['number'],
                ]);
            }

            return $extract;
        });

        $extract->load(['lottery', 'draw', 'numbers', 'creator']);

        return response()->json(new ExtractResource($extract), 201);
    }

    public function show(Extract $extract): JsonResponse
    {
        $extract->load(['lottery', 'draw', 'numbers', 'creator']);

        return response()->json(new ExtractResource($extract));
    }
}
