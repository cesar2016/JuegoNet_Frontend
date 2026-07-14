<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BetItem extends Model
{
    protected $fillable = ['bet_id', 'number', 'type', 'amount'];

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
