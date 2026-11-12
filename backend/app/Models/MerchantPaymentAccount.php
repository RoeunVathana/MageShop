<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchantPaymentAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'seller_application_id',
        'account_type',
        'bank_name',
        'account_id',
        'merchant_name',
        'merchant_city',
        'merchant_phone',
        'currency',
        'is_default',
        'is_active',
        'verified_at',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'verified_at' => 'datetime',
    ];

    protected $hidden = [
        'user_id',
        'seller_application_id',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function sellerApplication(): BelongsTo
    {
        return $this->belongsTo(SellerApplication::class);
    }
}
