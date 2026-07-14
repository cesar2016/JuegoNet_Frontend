<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LotteryDrawScheduleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'draw_id'      => $this->draw_id,
            'draw_name'    => $this->draw?->name,
            'draw_time'    => $this->draw_time?->format('H:i'),
            'closing_time' => $this->closing_time?->format('H:i'),
        ];
    }
}
