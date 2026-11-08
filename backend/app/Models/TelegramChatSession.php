<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramChatSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'telegram_account_id',
        'session_type',
        'context_data',
    ];

    protected $casts = [
        'context_data' => 'array',
    ];

    public function telegramAccount(): BelongsTo
    {
        return $this->belongsTo(TelegramAccount::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(TelegramAiMessage::class, 'session_id');
    }
}
