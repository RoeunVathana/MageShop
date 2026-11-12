<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_number',
        'checkout_idempotency_key',
        'user_id',
        'driver_id',
        'status',
        'subtotal',
        'discount',
        'coupon_code',
        'points_earned',
        'points_redeemed',
        'free_reward_product_id',
        'shipping_fee',
        'tax',
        'total_amount',
        'currency',
        'payment_status',
        'payment_method',
        'customer_name',
        'customer_email',
        'customer_phone',
        'delivery_address',
        'notes',
        'driver_name',
        'driver_phone',
        'driver_vehicle',
        'current_lat',
        'current_lng',
        'dest_lat',
        'dest_lng',
        'estimated_arrival',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'tax' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function receipt(): HasOne
    {
        return $this->hasOne(Receipt::class);
    }

    // Accessors for flexible template formatting
    public function getShippingFullNameAttribute(): string
    {
        return $this->customer_name ?? 'Valued Customer';
    }

    public function getShippingEmailAttribute(): ?string
    {
        return $this->customer_email;
    }

    public function getShippingPhoneAttribute(): ?string
    {
        return $this->customer_phone;
    }

    public function getShippingAddressLine1Attribute(): string
    {
        return $this->delivery_address ?? 'Phnom Penh, Cambodia';
    }

    public function getShippingAddressLine2Attribute(): ?string
    {
        return null;
    }

    public function getShippingCityAttribute(): string
    {
        return 'Phnom Penh';
    }

    public function getShippingCountryAttribute(): string
    {
        return 'Cambodia';
    }

    public function getShippingMethodAttribute(): string
    {
        return 'Express Dispatch (Nationwide)';
    }

    public function getDiscountAmountAttribute(): float
    {
        return (float) ($this->discount ?? 0);
    }

    public function getTrackingNumberAttribute(): ?string
    {
        return 'TRK-'.substr(md5($this->order_number), 0, 8);
    }

    public function getShippingCarrierAttribute(): string
    {
        return 'TYUSHOP Express Courier';
    }
}
