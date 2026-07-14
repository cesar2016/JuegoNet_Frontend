<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lottery extends Model
{
    protected $fillable = ['name', 'initials', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function draws()
    {
        return $this->belongsToMany(Draw::class, 'lottery_draw_schedule')
            ->withPivot('draw_time', 'closing_time', 'is_active')
            ->withTimestamps();
    }

    public function schedules()
    {
        return $this->hasMany(LotteryDrawSchedule::class);
    }

    public function extracts()
    {
        return $this->hasMany(Extract::class);
    }
}
