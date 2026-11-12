<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'transaction_reference',
        'payment_method',
        'amount',
        'currency',
        'status',
        'khqr_string',
        'khqr_md5',
        'merchant_account',
        'merchant_name',
        'merchant_city',
        'gateway_payload',
        'verified_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'gateway_payload' => 'array',
        'verified_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
