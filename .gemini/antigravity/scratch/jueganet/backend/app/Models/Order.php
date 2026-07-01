<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'raffle_id',
        'total_price',
        'status',
        'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'total_price' => 'decimal:2',
            'confirmed_at' => 'datetime',
        ];
    }

    public function scopeForAdmin($query, int $adminId)
    {
        return $query->where(function ($q) use ($adminId) {
            $q->whereHas('raffle', fn ($r) => $r->where('admin_id', $adminId))
                ->orWhereHas('user', fn ($u) => $u->where('admin_id', $adminId));
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function raffle()
    {
        return $this->belongsTo(Raffle::class);
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class);
    }
}
