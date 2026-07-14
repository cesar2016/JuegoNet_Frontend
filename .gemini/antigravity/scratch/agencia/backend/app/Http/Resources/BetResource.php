<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'sequence'   => $this->sequence,
            'user'       => new UserResource($this->whenLoaded('user')),
            'draw'       => new DrawResource($this->whenLoaded('draw')),
            'lotteries'  => LotteryResource::collection($this->whenLoaded('lotteries')),
            'items'      => BetItemResource::collection($this->whenLoaded('items')),
            'redoblonas' => RedoblonaResource::collection($this->whenLoaded('redoblonas')),
            'draw_date'  => $this->draw_date->format('Y-m-d'),
            'subtotal'   => $this->subtotal,
            'total'      => $this->total,
            'status'     => $this->status,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
        ];
    }
}
