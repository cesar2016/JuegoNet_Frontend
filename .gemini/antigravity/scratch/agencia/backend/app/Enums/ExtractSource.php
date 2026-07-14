<?php

namespace App\Enums;

enum ExtractSource: string
{
    case Manual = 'manual';
    case Api = 'api';
    case Scraping = 'scraping';
}
