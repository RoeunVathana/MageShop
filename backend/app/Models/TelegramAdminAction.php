<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramAdminAction extends Model
{
    use HasFactory;

    protected $fillable = [
        'staff_id',
        'action',
        'target_type',
        'target_id',
        'payload',
        'confirmation_status',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }
}

