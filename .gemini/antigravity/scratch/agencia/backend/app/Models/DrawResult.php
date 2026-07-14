<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DrawResult extends Model
{
    protected $fillable = [
        'extract_id', 'bet_id', 'bet_item_id', 'redoblona_id',
        'position', 'prize_amount', 'status',
    ];

    protected function casts(): array
    {
        return [
            'prize_amount' => 'decimal:2',
        ];
    }

    public function extract()
    {
        return $this->belongsTo(Extract::class);
    }

    public function bet()
    {
        return $this->belongsTo(Bet::class);
    }

    public function betItem()
    {
        return $this->belongsTo(BetItem::class);
    }

    public function redoblona()
    {
        return $this->belongsTo(Redoblona::class);
    }
}
