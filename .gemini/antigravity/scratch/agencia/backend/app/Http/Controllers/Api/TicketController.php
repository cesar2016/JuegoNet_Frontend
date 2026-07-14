<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bet;
use App\Services\PdfService;
use Illuminate\Http\JsonResponse;

class TicketController extends Controller
{
    public function __construct(
        private readonly PdfService $pdfService
    ) {}

    public function download(Bet $bet): mixed
    {
        $pdf = $this->pdfService->generateTicket($bet);

        return $pdf->download("ticket-{$bet->sequence}.pdf");
    }

    public function reprint(Bet $bet): mixed
    {
        $pdf = $this->pdfService->generateTicket($bet);

        return $pdf->stream("ticket-{$bet->sequence}.pdf");
    }
}
