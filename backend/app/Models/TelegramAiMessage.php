<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramAiMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_id',
        'sender',
        'message',
        'tool_calls',
    ];

    protected $casts = [
        'tool_calls' => 'array',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(TelegramChatSession::class, 'session_id');
    }
}

