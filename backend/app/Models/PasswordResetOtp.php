<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PasswordResetOtp extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'otp_hash',
        'expires_at',
        'attempts',
        'cooldown_until',
        'reset_token',
        'reset_token_expires_at',
        'is_used',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'cooldown_until' => 'datetime',
        'reset_token_expires_at' => 'datetime',
        'is_used' => 'boolean',
        'attempts' => 'integer',
    ];

    /**
     * Check if OTP has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if cooldown is active.
     */
    public function isCoolingDown(): bool
    {
        return $this->cooldown_until !== null && $this->cooldown_until->isFuture();
    }
}

