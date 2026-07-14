<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Redoblona extends Model
{
    protected $fillable = [
        'bet_id', 'first_number', 'second_number',
        'first_range', 'second_range', 'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function bet()
    {
        return $this->belongsTo(Bet::class);
    }
}
