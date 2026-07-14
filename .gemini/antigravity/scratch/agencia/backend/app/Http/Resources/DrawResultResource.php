<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DrawResultResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'bet_id'       => $this->bet_id,
            'bet_item_id'  => $this->bet_item_id,
            'redoblona_id' => $this->redoblona_id,
            'position'     => $this->position,
            'prize_amount' => $this->prize_amount,
            'status'       => $this->status,
            'bet'          => new BetResource($this->whenLoaded('bet')),
        ];
    }
}
