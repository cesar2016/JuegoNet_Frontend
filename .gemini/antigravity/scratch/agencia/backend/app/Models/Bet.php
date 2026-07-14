<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bet extends Model
{
    protected $fillable = [
        'sequence', 'user_id', 'draw_id', 'draw_date',
        'subtotal', 'total', 'status',
    ];

    protected function casts(): array
    {
        return [
            'draw_date' => 'date:Y-m-d',
            'subtotal' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function draw()
    {
        return $this->belongsTo(Draw::class);
    }

    public function lotteries()
    {
        return $this->belongsToMany(Lottery::class, 'bet_lottery');
    }

    public function items()
    {
        return $this->hasMany(BetItem::class);
    }

    public function redoblonas()
    {
        return $this->hasMany(Redoblona::class);
    }

    public function drawResults()
    {
        return $this->hasMany(DrawResult::class);
    }
}
