<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class N8nErrorLog extends Model
{
    protected $table = 'n8n_error_logs';

    /** This table only tracks creation time (no updated_at column). */
    public const UPDATED_AT = null;

    protected $fillable = [
        'workflow',
        'node',
        'error',
        'failed_at',
    ];
}
