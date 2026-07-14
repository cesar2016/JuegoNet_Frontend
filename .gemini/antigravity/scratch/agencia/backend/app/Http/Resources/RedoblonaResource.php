<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RedoblonaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'first_number'  => $this->first_number,
            'second_number' => $this->second_number,
            'first_range'   => $this->first_range,
            'second_range'  => $this->second_range,
            'amount'        => $this->amount,
        ];
    }
}
