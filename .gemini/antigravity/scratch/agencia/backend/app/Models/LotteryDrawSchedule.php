<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LotteryDrawSchedule extends Model
{
    protected $table = 'lottery_draw_schedule';

    protected $fillable = ['lottery_id', 'draw_id', 'draw_time', 'closing_time', 'is_active'];

    protected function casts(): array
    {
        return [
            'draw_time' => 'datetime:H:i',
            'closing_time' => 'datetime:H:i',
            'is_active' => 'boolean',
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
}
