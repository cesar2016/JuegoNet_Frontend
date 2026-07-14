<?php

namespace App\Services;

use App\Models\Bet;
use Barryvdh\DomPDF\Facade\Pdf;

class PdfService
{
    public function generateTicket(Bet $bet): \Barryvdh\DomPDF\PDF
    {
        $bet->load(['user', 'draw', 'lotteries', 'items', 'redoblonas']);

        $lotteryInitials = $bet->lotteries->pluck('initials')->implode(' ');
        $drawName = $bet->draw->name;
        $schedule = $bet->draw->schedules->first();
        $drawTime = $schedule?->draw_time?->format('H:i') ?? '--:--';

        $data = [
            'date'     => now()->format('d/m/y H:i'),
            'pasador'  => $bet->user->name,
            'sequence' => $bet->sequence,
            'sorteo'   => "{$drawName} ({$drawTime})",
            'lotteries' => $lotteryInitials,
            'items'    => $bet->items,
            'redoblonas' => $bet->redoblonas,
            'subtotal' => $bet->subtotal,
            'total'    => $bet->total,
        ];

        $html = view('pdfs.ticket', $data)->render();

        return Pdf::loadHTML($html)->setPaper([0, 0, 226.77, 600], 'portrait');
    }
}
