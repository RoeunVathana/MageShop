<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use HasFactory;

    protected $table = 'coupons';

    protected $fillable = [
        'code',
        'description',
        'discount_type',
        'discount_value',
        'min_order_amount',
        'max_discount_amount',
        'is_active',
        'expires_at',
    ];

    protected $casts = [
        'discount_value' => 'float',
        'min_order_amount' => 'float',
        'max_discount_amount' => 'float',
        'is_active' => 'boolean',
        'expires_at' => 'datetime',
    ];

    protected $appends = [
        'formatted_discount',
        'cart_label',
    ];

    /**
     * Scope to query only valid and active coupons.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', now());
            });
    }

    /**
     * Formatted discount string (e.g. "10% OFF" or "$5.00 OFF").
     */
    public function getFormattedDiscountAttribute(): string
    {
        if ($this->discount_type === 'percentage') {
            $val = round((float) $this->discount_value, 2);
            return (floor($val) == $val ? (int) $val : $val) . '% OFF';
        }

        return '$' . number_format((float) $this->discount_value, 2) . ' OFF';
    }

    /**
     * Storefront Cart Badge Label (e.g. "30% OFF (≥$100)").
     */
    public function getCartLabelAttribute(): string
    {
        $base = $this->formatted_discount;
        $min = (float) $this->min_order_amount;

        if ($min > 0) {
            $minFormatted = (floor($min) == $min) ? '$' . (int) $min : '$' . number_format($min, 2);
            return "{$base} (≥{$minFormatted})";
        }

        return $base;
    }
}
