<?php

namespace App\Enum;

enum EmailStatus: string
{
    case SENT = 'sent';
    case FAILED = 'failed';
    case PENDING = 'pending';
}
