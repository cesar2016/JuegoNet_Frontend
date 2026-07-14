<?php

namespace App\Enums;

enum BetType: string
{
    case Primera = 'primera';
    case ALos5 = 'a_los_5';
    case ALos10 = 'a_los_10';
    case ALos20 = 'a_los_20';

    public function range(): int
    {
        return match ($this) {
            self::Primera => 1,
            self::ALos5 => 5,
            self::ALos10 => 10,
            self::ALos20 => 20,
        };
    }
}
