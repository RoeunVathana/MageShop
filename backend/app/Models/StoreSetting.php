<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class StoreSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'setting_key',
        'setting_value',
    ];

    /**
     * Get a setting by key with caching.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember("store_setting:{$key}", 3600, function () use ($key, $default) {
            $setting = self::where('setting_key', $key)->first();
            return $setting ? $setting->setting_value : $default;
        });
    }

    /**
     * Set/update a setting by key and clear cache.
     */
    public static function set(string $key, mixed $value, string $storeId = 'primary'): self
    {
        $setting = self::updateOrCreate(
            ['setting_key' => $key],
            ['setting_value' => is_array($value) ? json_encode($value) : $value, 'store_id' => $storeId]
        );

        Cache::forget("store_setting:{$key}");
        Cache::forget('store_settings:all');

        return $setting;
    }

    /**
     * Get all settings as key-value array.
     */
    public static function getAll(): array
    {
        return Cache::remember('store_settings:all', 3600, function () {
            return self::pluck('setting_value', 'setting_key')->toArray();
        });
    }
}

