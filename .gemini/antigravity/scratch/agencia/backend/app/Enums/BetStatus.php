<?php

namespace App\Enums;

enum BetStatus: string
{
    case Active = 'active';
    case Won = 'won';
    case Lost = 'lost';
    case Paid = 'paid';
}
