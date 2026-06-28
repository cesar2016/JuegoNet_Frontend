<?php

namespace App\Events;

use App\Models\Ticket;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class TicketStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public Ticket $ticket,
        public int $raffleId,
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel('raffle.'.$this->raffleId)];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->ticket->id,
            'number' => $this->ticket->number,
            'status' => $this->ticket->status,
            'user_id' => $this->ticket->user_id,
            'user' => $this->ticket->relationLoaded('user') && $this->ticket->user
                ? ['name' => $this->ticket->user->name, 'avatar' => $this->ticket->user->avatar]
                : null,
            'reserved_at' => $this->ticket->reserved_at,
        ];
    }
}
