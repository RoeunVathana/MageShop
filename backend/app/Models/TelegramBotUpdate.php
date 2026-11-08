<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TelegramBotUpdate extends Model
{
    use HasFactory;

    protected $fillable = [
        'update_id',
        'processed_at',
        'status',
    ];

    protected $casts = [
        'update_id' => 'integer',
        'processed_at' => 'datetime',
    ];
}
