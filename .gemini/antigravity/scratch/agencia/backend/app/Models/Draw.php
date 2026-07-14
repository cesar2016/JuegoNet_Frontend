<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Draw extends Model
{
    protected $fillable = ['name', 'order', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function lotteries()
    {
        return $this->belongsToMany(Lottery::class, 'lottery_draw_schedule')
            ->withPivot('draw_time', 'closing_time', 'is_active')
            ->withTimestamps();
    }

    public function schedules()
    {
        return $this->hasMany(LotteryDrawSchedule::class);
    }

    public function bets()
    {
        return $this->hasMany(Bet::class);
    }

    public function extracts()
    {
        return $this->hasMany(Extract::class);
    }
}
