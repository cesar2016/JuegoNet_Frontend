<?php

namespace App\Events;

use App\Models\Ticket;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class TicketStatusChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public Ticket $ticket,
        public int $raffleId,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('raffle.'.$this->raffleId)];
    }

    public function broadcastAs(): string
    {
        return 'TicketStatusChanged';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->ticket->id,
            'raffle_id' => $this->raffleId,
            'number' => $this->ticket->number,
            'status' => $this->ticket->status,
            'user_id' => $this->ticket->user_id,
            'order_id' => $this->ticket->order_id,
            'user' => $this->ticket->relationLoaded('user') && $this->ticket->user
                ? ['name' => $this->ticket->user->name, 'avatar' => $this->ticket->user->avatar]
                : null,
            'reserved_at' => $this->ticket->reserved_at,
        ];
    }
}
