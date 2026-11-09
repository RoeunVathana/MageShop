<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'store_name',
        'slug',
        'category',
        'description',
        'phone',
        'telegram_username',
        'city',
        'address',
        'bank_name',
        'bakong_account_id',
        'logo_url',
        'banner_url',
        'status',
        'rejection_reason',
        'approved_at',
        'rejected_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    /**
     * Approve seller application and assign SELLER role to the user.
     */
    public function approve(): void
    {
        $this->update([
            'status' => 'approved',
            'rejection_reason' => null,
            'approved_at' => now(),
        ]);

        if ($this->user) {
            if (method_exists($this->user, 'assignRole')) {
                $this->user->assignRole('SELLER');
            }
        }
    }

    /**
     * Reject seller application.
     */
    public function reject(string $reason): void
    {
        $this->update([
            'status' => 'rejected',
            'rejection_reason' => $reason,
            'rejected_at' => now(),
        ]);
    }
}
