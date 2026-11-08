<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'chat_id',
        'notification_type',
        'delivery_status',
        'payload',
        'sent_at',
    ];

    protected $casts = [
        'chat_id' => 'integer',
        'payload' => 'array',
        'sent_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
