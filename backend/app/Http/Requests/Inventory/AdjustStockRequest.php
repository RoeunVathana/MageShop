<?php

namespace App\Http\Requests\Inventory;

use App\Models\Inventory;
use Illuminate\Foundation\Http\FormRequest;

class AdjustStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user ? $user->can('adjust', Inventory::class) : false;
    }

    public function rules(): array
    {
        return [
            'quantity_change' => ['required', 'integer', 'not_in:0'],
            'movement_type' => ['required', 'string', 'in:STOCK_IN,STOCK_OUT,ADJUSTMENT,DAMAGE,RETURN,stock_in,stock_out,adjustment,damage,return'],
            'reason' => ['required', 'string', 'max:255'],
            'reference' => ['nullable', 'string', 'max:100'],
            'idempotency_key' => ['nullable', 'string', 'max:64'],
        ];
    }
}
