<?php

namespace App\Enums;

enum ExtractStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
}
