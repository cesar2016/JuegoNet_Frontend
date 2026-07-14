<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExtractResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'lottery'   => new LotteryResource($this->whenLoaded('lottery')),
            'draw'      => new DrawResource($this->whenLoaded('draw')),
            'draw_date' => $this->draw_date->format('Y-m-d'),
            'status'    => $this->status,
            'source'    => $this->source,
            'numbers'   => ExtractNumberResource::collection($this->whenLoaded('numbers')),
            'created_by' => $this->created_by,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
        ];
    }
}
