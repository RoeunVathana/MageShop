<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'telegram_user_id',
        'telegram_username',
        'first_name',
        'last_name',
        'photo_url',
        'language_code',
        'is_bot_admin',
        'linked_at',
    ];

    protected $casts = [
        'telegram_user_id' => 'integer',
        'is_bot_admin' => 'boolean',
        'linked_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(TelegramChatSession::class);
    }
}
