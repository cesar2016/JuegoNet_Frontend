<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Raffle extends Model
{
    protected $fillable = [
        'name',
        'start_time',
        'end_time',
        'ticket_price',
        'prizes_count',
        'cart_expiry_minutes',
        'winning_numbers',
        'drawn_at',
        'is_active',
        'admin_id',
    ];

    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'ticket_price' => 'decimal:2',
            'prizes_count' => 'integer',
            'cart_expiry_minutes' => 'integer',
            'winning_numbers' => 'array',
            'drawn_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function scopeForAdmin($query, int $adminId)
    {
        return $query->where('admin_id', $adminId);
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
