<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LotteryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'       => $this->id,
            'name'     => $this->name,
            'initials' => $this->initials,
            'schedules' => LotteryDrawScheduleResource::collection($this->whenLoaded('schedules')),
        ];
    }
}
