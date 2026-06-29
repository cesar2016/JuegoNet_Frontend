<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class AdminNotification implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public int $adminId,
        public string $type,
        public array $data = [],
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('admin.'.$this->adminId)];
    }

    public function broadcastAs(): string
    {
        return 'AdminNotification';
    }

    public function broadcastWith(): array
    {
        return [
            'type' => $this->type,
            'data' => $this->data,
        ];
    }
}
