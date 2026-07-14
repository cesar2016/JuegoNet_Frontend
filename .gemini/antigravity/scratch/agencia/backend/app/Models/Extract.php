<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Extract extends Model
{
    protected $fillable = [
        'lottery_id', 'draw_id', 'draw_date', 'status',
        'source', 'external_id', 'raw_response', 'processed_at', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'draw_date' => 'date:Y-m-d',
            'raw_response' => 'array',
            'processed_at' => 'datetime',
        ];
    }

    public function lottery()
    {
        return $this->belongsTo(Lottery::class);
    }

    public function draw()
    {
        return $this->belongsTo(Draw::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function numbers()
    {
        return $this->hasMany(ExtractNumber::class);
    }

    public function drawResults()
    {
        return $this->hasMany(DrawResult::class);
    }
}
