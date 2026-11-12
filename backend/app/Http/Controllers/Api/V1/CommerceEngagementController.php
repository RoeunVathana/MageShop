<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Receipt;
use App\Models\StoreSetting;
use App\Services\Receipt\PaymentReceiptPdfService;
use App\Services\Telegram\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CommerceEngagementController extends Controller
{
    public const POINTS_PER_PURCHASE = 5;

    public const POINTS_FOR_FREE_ITEM = 100;

    public const FREE_ITEM_MAX_PRICE = 30.00;

    /**
     * List active discount coupons and loyalty program rules.
     */
    public function coupons(): JsonResponse
    {
        try {
            $coupons = Coupon::active()
                ->orderBy('discount_value', 'desc')
                ->get();
        } catch (\Throwable $e) {
            $coupons = DB::table('coupons')
                ->where('is_active', true)
                ->orderBy('discount_value', 'desc')
                ->get();
        }

        $freeItemMaxPrice = (float) StoreSetting::get('loyalty_free_item_max_price', self::FREE_ITEM_MAX_PRICE);
        $pointsForFreeItem = (int) StoreSetting::get('loyalty_points_for_free_item', self::POINTS_FOR_FREE_ITEM);
        $pointsPerPurchase = (int) StoreSetting::get('loyalty_points_per_purchase', self::POINTS_PER_PURCHASE);

        return response()->json([
            'status' => 'ok',
            'data' => $coupons,
            'loyalty_rules' => [
                'points_per_purchase' => $pointsPerPurchase,
                'points_for_free_item' => $pointsForFreeItem,
                'free_item_max_price' => $freeItemMaxPrice,
                'description' => "Earn {$pointsPerPurchase} points on every purchase! Collect {$pointsForFreeItem} points to redeem any item priced up to \${$freeItemMaxPrice} for FREE.",
            ],
        ]);
    }

    /**
     * Validate a discount coupon code against a cart subtotal.
     */
    public function validateCoupon(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:40'],
            'subtotal' => ['required', 'numeric', 'min:0'],
        ]);

        $code = strtoupper(trim($validated['code']));
        $subtotal = (float) $validated['subtotal'];

        $coupon = null;
        try {
            $coupon = DB::table('coupons')
                ->whereRaw('UPPER(code) = ?', [$code])
                ->where('is_active', true)
                ->first();
        } catch (\Throwable $e) {
            $coupon = null;
        }

        // In-memory fallback promotion coupons for 100% resilience
        if (! $coupon) {
            $fallbackCoupons = [
                'WELCOME10' => (object) [
                    'code' => 'WELCOME10',
                    'description' => '10% OFF Welcome Coupon for new and returning shoppers',
                    'discount_type' => 'percentage',
                    'discount_value' => 10.0,
                    'min_order_amount' => 10.0,
                    'max_discount_amount' => 50.0,
                ],
                'MEGA20' => (object) [
                    'code' => 'MEGA20',
                    'description' => '20% OFF Mega Flash Promotion (orders $50+)',
                    'discount_type' => 'percentage',
                    'discount_value' => 20.0,
                    'min_order_amount' => 50.0,
                    'max_discount_amount' => 150.0,
                ],
                'KHQR5' => (object) [
                    'code' => 'KHQR5',
                    'description' => '$5.00 Instant Cash Discount for Bakong KHQR users',
                    'discount_type' => 'fixed',
                    'discount_value' => 5.0,
                    'min_order_amount' => 15.0,
                    'max_discount_amount' => null,
                ],
                'VIP30' => (object) [
                    'code' => 'VIP30',
                    'description' => '30% OFF VIP Exclusive Voucher (orders $100+)',
                    'discount_type' => 'percentage',
                    'discount_value' => 30.0,
                    'min_order_amount' => 100.0,
                    'max_discount_amount' => 200.0,
                ],
            ];
            $coupon = $fallbackCoupons[$code] ?? null;
        }

        if (! $coupon) {
            return response()->json([
                'status' => 'error',
                'message' => "Coupon code '{$code}' is invalid or expired.",
            ], 422);
        }

        if ($subtotal < (float) $coupon->min_order_amount) {
            $minAmount = number_format((float) $coupon->min_order_amount, 2);

            return response()->json([
                'status' => 'error',
                'message' => "Coupon '{$code}' requires a minimum order of \${$minAmount}. (Current cart: \$".number_format($subtotal, 2).')',
            ], 422);
        }

        $discount = 0.0;
        if ($coupon->discount_type === 'percentage') {
            $discount = round($subtotal * ((float) $coupon->discount_value / 100), 2);
            if ($coupon->max_discount_amount !== null) {
                $discount = min($discount, (float) $coupon->max_discount_amount);
            }
        } else {
            $discount = min($subtotal, (float) $coupon->discount_value);
        }

        return response()->json([
            'status' => 'ok',
            'message' => "Coupon '{$coupon->code}' applied! You saved $".number_format($discount, 2),
            'data' => [
                'code' => $coupon->code,
                'description' => $coupon->description,
                'discount_type' => $coupon->discount_type,
                'discount_value' => (float) $coupon->discount_value,
                'discount_amount' => $discount,
                'new_subtotal' => max(0, round($subtotal - $discount, 2)),
            ],
        ]);
    }

    /**
     * Get loyalty points summary, transactions, and eligible free products under $20-$30.
     */
    public function loyaltySummary(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        $points = $user ? (int) ($user->loyalty_points ?? 0) : 0;

        $freeItemMaxPrice = (float) StoreSetting::get('loyalty_free_item_max_price', self::FREE_ITEM_MAX_PRICE);
        $pointsForFreeItem = (int) StoreSetting::get('loyalty_points_for_free_item', self::POINTS_FOR_FREE_ITEM);
        $pointsPerPurchase = (int) StoreSetting::get('loyalty_points_per_purchase', self::POINTS_PER_PURCHASE);

        $eligibleProducts = Product::query()
            ->where(function ($q) use ($freeItemMaxPrice) {
                $q->where(function ($sub) use ($freeItemMaxPrice) {
                    $sub->where('selling_price', '<=', $freeItemMaxPrice)
                        ->orWhere('price', '<=', $freeItemMaxPrice);
                })
                ->orWhere(function ($q2) use ($freeItemMaxPrice) {
                    $q2->whereNotNull('discount_price')
                        ->where('discount_price', '<=', $freeItemMaxPrice);
                });
            })
            ->where('status', '!=', 'archived')
            ->orderBy('selling_price', 'asc')
            ->limit(24)
            ->get()
            ->map(function (Product $p) use ($freeItemMaxPrice, $pointsForFreeItem) {
                $basePrice = (float) ($p->selling_price ?? $p->price ?? 0);
                $effectivePrice = ($p->discount_price !== null && (float) $p->discount_price > 0 && (float) $p->discount_price < $basePrice)
                    ? (float) $p->discount_price
                    : $basePrice;

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'slug' => $p->slug,
                    'sku' => $p->sku,
                    'price' => $basePrice,
                    'discount_price' => $p->discount_price !== null ? (float) $p->discount_price : null,
                    'effective_price' => $effectivePrice,
                    'image_url' => $p->image_url,
                    'stock_quantity' => (int) ($p->available_stock ?? $p->stock_quantity ?? 0),
                    'points_cost' => $pointsForFreeItem,
                    'is_eligible_free' => $effectivePrice <= $freeItemMaxPrice,
                ];
            });

        $transactions = [];
        if ($user) {
            $transactions = DB::table('loyalty_transactions')
                ->where('user_id', $user->id)
                ->orderByDesc('id')
                ->limit(20)
                ->get();
        }

        return response()->json([
            'status' => 'ok',
            'data' => [
                'loyalty_points' => $points,
                'can_redeem_free_item' => $points >= $pointsForFreeItem,
                'points_needed_for_next_free_item' => max(0, $pointsForFreeItem - ($points % $pointsForFreeItem)),
                'rules' => [
                    'points_per_purchase' => $pointsPerPurchase,
                    'points_for_free_item' => $pointsForFreeItem,
                    'free_item_max_price' => $freeItemMaxPrice,
                ],
                'eligible_free_products' => $eligibleProducts,
                'transactions' => $transactions,
            ],
        ]);
    }

    /**
     * Place an order from Cart with Coupon Discount, +5 Loyalty Points per buy,
     * and optional 100-Point Free Item redemption (for items <= $30).
     */
    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'coupon_code' => ['nullable', 'string', 'max:40'],
            'idempotency_key' => ['nullable', 'string', 'max:80', 'regex:/^[A-Za-z0-9._:-]+$/'],
            'redeem_free_product_id' => ['nullable', 'integer'],
            'customer_name' => ['required', 'string', 'max:120'],
            'customer_email' => ['nullable', 'email', 'max:150'],
            'customer_phone' => ['required', 'string', 'max:40'],
            'delivery_address' => ['required', 'string', 'max:500'],
            'dest_lat' => ['nullable', 'numeric'],
            'dest_lng' => ['nullable', 'numeric'],
            'payment_method' => ['nullable', 'string', Rule::in(['bakong_khqr', 'cash_on_delivery'])],
            'initiate_qr' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
            'delivery_method_id' => ['nullable', 'string', 'max:60'],
        ]);

        $user = $request->user('sanctum') ?? $request->user();
        if (! $user) {
            abort(401, 'Authentication is required to place an order.');
        }

        // A client may retry after a network timeout. Return the original
        // checkout instead of creating a second order or awarding points twice.
        $idempotencyKey = trim((string) ($validated['idempotency_key'] ?? ''));
        $hasIdempotencyColumn = false;
        try {
            $hasIdempotencyColumn = Schema::hasColumn('orders', 'checkout_idempotency_key');
        } catch (\Throwable) {
            // Keep checkout available if schema inspection is temporarily unavailable.
        }

        if ($idempotencyKey !== '' && $hasIdempotencyColumn) {
            $existingOrder = Order::with(['items', 'payments', 'receipt'])
                ->where('user_id', $user->id)
                ->where('checkout_idempotency_key', $idempotencyKey)
                ->first();

            if ($existingOrder) {
                return $this->existingCheckoutResponse($existingOrder);
            }
        }

        $availablePoints = (int) ($user->loyalty_points ?? 0);

        // Validate a loyalty reward before pricing the regular cart items.
        $pointsRedeemed = 0;
        $freeProduct = null;
        if (! empty($validated['redeem_free_product_id'])) {
            $freeProduct = Product::where('is_active', true)->find($validated['redeem_free_product_id']);
            if (! $freeProduct) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Selected free reward product was not found.',
                ], 422);
            }

            $freeItemMaxPrice = (float) StoreSetting::get('loyalty_free_item_max_price', self::FREE_ITEM_MAX_PRICE);
            $pointsForFreeItem = (int) StoreSetting::get('loyalty_points_for_free_item', self::POINTS_FOR_FREE_ITEM);
            $basePrice = (float) ($freeProduct->selling_price ?? $freeProduct->price ?? 0);
            $effectivePrice = ($freeProduct->discount_price !== null && (float) $freeProduct->discount_price > 0 && (float) $freeProduct->discount_price < $basePrice)
                ? (float) $freeProduct->discount_price
                : $basePrice;

            if ($effectivePrice > $freeItemMaxPrice) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Loyalty Free Item redemption is only eligible for products priced up to \${$freeItemMaxPrice}.",
                ], 422);
            }

            if ($availablePoints < $pointsForFreeItem) {
                return response()->json([
                    'status' => 'error',
                    'message' => "You need at least {$pointsForFreeItem} loyalty points to redeem a free item. Current points: ".$availablePoints,
                ], 422);
            }

            $pointsRedeemed = $pointsForFreeItem;
        }

        $products = Product::with('inventory')
            ->whereIn('id', collect($validated['items'])->pluck('product_id')->unique())
            ->where('is_active', true)
            ->get()
            ->keyBy('id');

        $orderItems = [];
        $subtotal = 0.0;
        $requestedQuantities = [];
        foreach ($validated['items'] as $item) {
            $product = $products->get((int) $item['product_id']);

            // The free reward is re-added below at $0.00 after the points check.
            if ($freeProduct && (int) $item['product_id'] === (int) $freeProduct->id && (float) $item['price'] === 0.0) {
                continue;
            }

            if (! $product) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'One or more selected products are no longer available.',
                ], 422);
            }

            $basePrice = (float) ($product->selling_price ?? $product->price ?? 0);
            $effectivePrice = ($product->discount_price !== null && (float) $product->discount_price > 0 && (float) $product->discount_price < $basePrice)
                ? (float) $product->discount_price
                : $basePrice;
            $quantity = (int) $item['quantity'];
            $requestedQuantities[$product->id] = ($requestedQuantities[$product->id] ?? 0) + $quantity;

            $orderItems[] = [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'product_sku' => $product->sku ?: 'SKU-'.$product->id,
                'quantity' => $quantity,
                'unit_price' => $effectivePrice,
                'total_price' => round($effectivePrice * $quantity, 2),
            ];
            $subtotal += round($effectivePrice * $quantity, 2);
        }

        if ($freeProduct) {
            $requestedQuantities[$freeProduct->id] = ($requestedQuantities[$freeProduct->id] ?? 0) + 1;
        }

        foreach ($requestedQuantities as $productId => $requestedQuantity) {
            $product = $products->get((int) $productId) ?? $freeProduct;
            if (! $product || $product->isDigital()) {
                continue;
            }

            $availableStock = (int) $product->available_stock;
            if ($requestedQuantity > $availableStock) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Insufficient stock for {$product->name}. Only {$availableStock} unit(s) are available.",
                ], 422);
            }
        }

        // 1. Apply Coupon Discount if provided
        $discount = 0.0;
        $appliedCouponCode = null;
        if (! empty($validated['coupon_code'])) {
            $code = strtoupper(trim($validated['coupon_code']));
            $coupon = DB::table('coupons')
                ->whereRaw('UPPER(code) = ?', [$code])
                ->where('is_active', true)
                ->first();

            if ($coupon && $subtotal >= (float) $coupon->min_order_amount) {
                $appliedCouponCode = $coupon->code;
                if ($coupon->discount_type === 'percentage') {
                    $discount = round($subtotal * ((float) $coupon->discount_value / 100), 2);
                    if ($coupon->max_discount_amount !== null) {
                        $discount = min($discount, (float) $coupon->max_discount_amount);
                    }
                } else {
                    $discount = min($subtotal, (float) $coupon->discount_value);
                }
            }
        }

        // 3. Dynamic Delivery Fee Calculation based on Admin StoreSettings
        $isFreeDelivery = filter_var(StoreSetting::get('delivery_is_free', true), FILTER_VALIDATE_BOOLEAN);
        $freeDeliveryThreshold = (float) StoreSetting::get('delivery_free_threshold', 0.0);

        $shippingFee = 0.00;
        if (! $isFreeDelivery) {
            if ($freeDeliveryThreshold <= 0 || $subtotal < $freeDeliveryThreshold) {
                $defaultFee = (float) StoreSetting::get('delivery_default_fee', 1.50);
                $rawDeliveryMethods = StoreSetting::get('delivery_methods');
                $deliveryMethods = is_string($rawDeliveryMethods)
                    ? json_decode($rawDeliveryMethods, true)
                    : $rawDeliveryMethods;

                if (is_array($deliveryMethods) && ! empty($validated['delivery_method_id'])) {
                    foreach ($deliveryMethods as $method) {
                        if (
                            is_array($method)
                            && (string) ($method['id'] ?? '') === (string) $validated['delivery_method_id']
                            && filter_var($method['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN)
                        ) {
                            $defaultFee = (float) ($method['price'] ?? $defaultFee);
                            break;
                        }
                    }
                }

                $shippingFee = round(max(0, $defaultFee), 2);
            }
        }

        // 4. Every purchase earns +5 Loyalty Points ("buy ម្ដងបាន 5point")
        $pointsEarned = self::POINTS_PER_PURCHASE;
        $afterSubtotal = max(0, round($subtotal - $discount, 2));
        $tax = round($afterSubtotal * 0.0, 2); // 0% extra fee for KHQR promotion
        $totalAmount = round($afterSubtotal + $tax + $shippingFee, 2);

        $orderNumber = 'ORD-'.now()->format('Ymd').'-'.strtoupper(Str::random(5));
        $paymentMethod = $validated['payment_method'] ?? 'bakong_khqr';
        // Never let the client disable verification for a paid Bakong order.
        // Any non-zero KHQR checkout must remain pending until the gateway
        // confirms the exact amount, currency, and merchant account.
        $initiateQr = $paymentMethod === 'bakong_khqr' && $totalAmount > 0;
        $isCashOnArrival = $paymentMethod === 'cash_on_delivery' && $totalAmount > 0;

        if ($initiateQr && app()->environment('production') && ! $this->isBakongPaymentReady()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Bakong payment is not configured for verification. Please contact support or choose Cash on Delivery.',
            ], 503);
        }

        $paymentStatus = $isCashOnArrival ? 'cash_on_delivery' : ($initiateQr ? 'pending_qr' : 'paid');
        $txnRef = 'TXN-'.strtoupper(Str::random(10));
        $qrPaymentData = $initiateQr
            ? $this->buildBakongKhqrPayload($orderNumber, $totalAmount, $txnRef)
            : null;

        // Keep the order, payment, and loyalty ledger in one atomic write.
        try {
            [$order, $payment, $newPointsBalance] = DB::transaction(function () use (
                $orderNumber,
                $idempotencyKey,
                $user,
                $paymentStatus,
                $subtotal,
                $discount,
                $appliedCouponCode,
                $pointsEarned,
                $pointsRedeemed,
                $freeProduct,
                $shippingFee,
                $tax,
                $totalAmount,
                $paymentMethod,
                $validated,
                $orderItems,
                $isCashOnArrival,
                $initiateQr,
                $qrPaymentData,
                $txnRef,
                $availablePoints,
                $hasIdempotencyColumn
            ): array {
            $orderAttributes = [
                'order_number' => $orderNumber,
                'user_id' => $user->id,
                'status' => 'pending',
                'subtotal' => $subtotal,
                'discount' => $discount,
                'coupon_code' => $appliedCouponCode,
                'points_earned' => $pointsEarned,
                'points_redeemed' => $pointsRedeemed,
                'free_reward_product_id' => $freeProduct ? $freeProduct->id : null,
                'shipping_fee' => $shippingFee,
                'tax' => $tax,
                'total_amount' => $totalAmount,
                'currency' => 'USD',
                'payment_status' => $paymentStatus,
                'payment_method' => $paymentMethod,
                'customer_name' => $validated['customer_name'],
                'customer_email' => $validated['customer_email'] ?? $user->email,
                'customer_phone' => $validated['customer_phone'],
                'delivery_address' => $validated['delivery_address'],
                'notes' => $validated['notes'] ?? null,
                'dest_lat' => isset($validated['dest_lat']) ? (float) $validated['dest_lat'] : null,
                'dest_lng' => isset($validated['dest_lng']) ? (float) $validated['dest_lng'] : null,
                'current_lat' => null,
                'current_lng' => null,
                'estimated_arrival' => null,
            ];

            if ($hasIdempotencyColumn && $idempotencyKey !== '') {
                $orderAttributes['checkout_idempotency_key'] = $idempotencyKey;
            }

            $order = Order::create($orderAttributes);

            foreach ($orderItems as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['product_id'],
                    'product_name' => $item['product_name'],
                    'product_sku' => $item['product_sku'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_price' => $item['total_price'],
                ]);
            }

            // If a 100-point free item was redeemed, include it in OrderItems at $0.00
            if ($freeProduct) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $freeProduct->id,
                    'product_name' => '[FREE 100-PT REWARD] '.$freeProduct->name,
                    'product_sku' => $freeProduct->sku,
                    'quantity' => 1,
                    'unit_price' => 0.00,
                    'total_price' => 0.00,
                ]);
            }

            $payment = Payment::create([
                'order_id' => $order->id,
                'transaction_reference' => $txnRef,
                'payment_method' => $order->payment_method,
                'amount' => $totalAmount,
                'currency' => 'USD',
                'status' => $isCashOnArrival ? 'pending_arrival' : ($initiateQr ? 'pending_qr' : 'completed'),
                'verified_at' => ($isCashOnArrival || $initiateQr) ? null : now(),
                'khqr_string' => $qrPaymentData['qr_string'] ?? null,
                'khqr_md5' => $qrPaymentData['md5'] ?? null,
            ]);

            // Deduct redeemed points immediately, but award purchase points only after payment is final.
            $pointsAwardedNow = $paymentStatus === 'paid';
            $newPointsBalance = max(0, $availablePoints - $pointsRedeemed + ($pointsAwardedNow ? $pointsEarned : 0));
            $user->loyalty_points = $newPointsBalance;
            $user->save();

            if ($pointsRedeemed > 0 && $freeProduct) {
                DB::table('loyalty_transactions')->insert([
                    'user_id' => $user->id,
                    'order_id' => $order->id,
                    'type' => 'redeemed',
                    'points' => -$pointsRedeemed,
                    'description' => "Redeemed 100 points for FREE item: {$freeProduct->name}",
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            if ($pointsAwardedNow) {
                DB::table('loyalty_transactions')->insert([
                    'user_id' => $user->id,
                    'order_id' => $order->id,
                    'type' => 'earned',
                    'points' => $pointsEarned,
                    'description' => "Earned +{$pointsEarned} points from Order #{$order->order_number}",
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

                return [$order, $payment, $newPointsBalance];
            });
        } catch (QueryException $exception) {
            // Two retries can pass the initial lookup before either request
            // commits. Let the unique key win, then replay that order instead
            // of returning a database error or awarding points twice.
            $isUniqueViolation = in_array((string) $exception->getCode(), ['23000', '23505'], true);
            if ($idempotencyKey !== '' && $hasIdempotencyColumn && $isUniqueViolation) {
                $existingOrder = Order::where('user_id', $user->id)
                    ->where('checkout_idempotency_key', $idempotencyKey)
                    ->first();

                if ($existingOrder) {
                    return $this->existingCheckoutResponse($existingOrder);
                }
            }

            throw $exception;
        }
        $telegramNotified = false;
        $receipt = null;

        if ($initiateQr) {
            // Prepare receipt number while waiting for customer to scan & confirm QR payment
            $receipt = $this->prepareCheckoutReceipt($order, $payment, false);
        } else {
            // Immediately dispatch Customer Payment Report Email & Telegram Admin Report
            $receipt = $this->prepareCheckoutReceipt($order, $payment, true);
            if ($receipt) {
                $telegramNotified = app(TelegramService::class)->notifyAdminOrderAndPaymentReport($order, $receipt, $payment);
            }
        }

        // Receipt delivery is deliberately non-blocking. The order/payment rows
        // above are the source of truth; a mail, PDF, or receipt-table problem
        // must not make a successful checkout look like an internal server error.
        $receiptNumber = $receipt?->receipt_number ?: $this->fallbackReceiptNumber($order->order_number);

        return response()->json([
            'status' => 'ok',
            'message' => $initiateQr
                ? "Bakong KHQR generated for Order #{$order->order_number}. Please scan QR code to complete payment."
                : ($isCashOnArrival
                    ? "Order #{$order->order_number} confirmed for Cash on Hand upon delivery. Loyalty points will be awarded after handover."
                    : "Order #{$order->order_number} paid & confirmed! You earned +{$pointsEarned} Loyalty Points."),
            'data' => [
                'order' => $order->load('items'),
                'receipt_number' => $receiptNumber,
                'transaction_reference' => $txnRef,
                'email_status' => $receipt ? $receipt->email_status : 'pending',
                'email_sent_to' => $order->customer_email,
                'telegram_admin_notified' => $telegramNotified,
                // Do not expose a QR payload for COD or zero-value orders.
                'qr_payment' => $initiateQr ? $qrPaymentData : null,
                'payment_mode' => $isCashOnArrival ? 'cash_on_delivery' : ($initiateQr ? 'awaiting_qr_scan' : 'pay_now'),
                'amount_due_on_arrival' => $isCashOnArrival ? $totalAmount : 0.00,
                'points_earned' => $pointsEarned,
                'points_redeemed' => $pointsRedeemed,
                'new_loyalty_points' => $newPointsBalance,
                'tracking_url' => "/track-order/{$order->order_number}",
            ],
        ], 201);
    }

    /**
     * Return a safe, replayable checkout response for an idempotent retry.
     */
    protected function existingCheckoutResponse(Order $order): JsonResponse
    {
        $order->loadMissing(['items', 'payments', 'receipt']);
        $payment = $order->payments->sortByDesc('id')->first();
        $receipt = $order->receipt;
        // Payment gateway payloads must never be serialized in the order API.
        $order->unsetRelation('payments');
        $order->unsetRelation('receipt');
        $isPendingQr = $order->payment_method === 'bakong_khqr'
            && $order->payment_status === 'pending_qr'
            && $payment
            && ! empty($payment->khqr_string)
            && ! empty($payment->khqr_md5);

        $qrPayment = null;
        if ($isPendingQr) {
            $qrPayment = [
                'qr_string' => $payment->khqr_string,
                'md5' => $payment->khqr_md5,
                'merchant_account' => $this->bakongSetting('bakong_account_id', 'bakong.account_id'),
                'merchant_name' => $this->bakongSetting('bakong_merchant_name', 'bakong.merchant_name', 'TYUSHOP'),
                'merchant_city' => $this->bakongSetting('company_city', 'bakong.merchant_city', 'Phnom Penh'),
                'amount_usd' => (float) $order->total_amount,
                'amount_khr' => (int) round((float) $order->total_amount * 4100),
                'order_number' => $order->order_number,
                'transaction_reference' => $payment->transaction_reference,
                'expires_in_seconds' => $this->bakongQrExpirySeconds(),
            ];
        }

        return response()->json([
            'status' => 'ok',
            'message' => $isPendingQr
                ? "Bakong KHQR is ready for Order #{$order->order_number}."
                : "Checkout already processed for Order #{$order->order_number}.",
            'data' => [
                'order' => $order,
                'receipt_number' => $receipt?->receipt_number ?: $this->fallbackReceiptNumber($order->order_number),
                'transaction_reference' => $payment?->transaction_reference,
                'email_status' => $receipt?->email_status ?? 'pending',
                'email_sent_to' => $order->customer_email,
                'telegram_admin_notified' => false,
                'qr_payment' => $qrPayment,
                'payment_mode' => $order->payment_status === 'cash_on_delivery'
                    ? 'cash_on_delivery'
                    : ($isPendingQr ? 'awaiting_qr_scan' : 'pay_now'),
                'amount_due_on_arrival' => $order->payment_status === 'cash_on_delivery'
                    ? (float) $order->total_amount
                    : 0.00,
                'points_earned' => (int) ($order->points_earned ?? 0),
                'points_redeemed' => (int) ($order->points_redeemed ?? 0),
                'new_loyalty_points' => (int) ($order->user?->loyalty_points ?? 0),
                'tracking_url' => "/track-order/{$order->order_number}",
            ],
        ]);
    }

    /**
     * Return a non-mutating response when payment was already confirmed.
     */
    protected function alreadyConfirmedPaymentResponse(Order $order): JsonResponse
    {
        $order->loadMissing(['items', 'payments', 'receipt']);
        $payment = $order->payments->sortByDesc('id')->first();
        $receipt = $order->receipt;
        $order->unsetRelation('payments');
        $order->unsetRelation('receipt');

        return response()->json([
            'status' => 'ok',
            'message' => "Payment already confirmed for Order #{$order->order_number}.",
            'data' => [
                'order_number' => $order->order_number,
                'order' => $order,
                'receipt_number' => $receipt?->receipt_number ?: $this->fallbackReceiptNumber($order->order_number),
                'transaction_reference' => $payment?->transaction_reference,
                'email_status' => $receipt?->email_status,
                'email_sent_to' => $order->customer_email,
                'telegram_admin_notified' => false,
                'payment_status' => 'paid',
                'amount_due_on_arrival' => 0.00,
                'status' => $order->status,
                'new_loyalty_points' => (int) ($order->user?->loyalty_points ?? 0),
            ],
        ]);
    }

    /**
     * Resolve a Bakong setting while ignoring empty database overrides.
     * This keeps QR generation and gateway verification on the same merchant.
     */
    protected function bakongSetting(string $key, string $configKey, string $default = ''): string
    {
        // Payment configuration must reflect the latest admin change even if
        // a long-lived worker still has an old Redis value cached.
        $storedValue = trim((string) StoreSetting::query()
            ->where('setting_key', $key)
            ->value('setting_value'));

        if ($storedValue === '') {
            $storedValue = trim((string) StoreSetting::get($key, ''));
        }

        return $storedValue !== ''
            ? $storedValue
            : trim((string) config($configKey, $default));
    }

    protected function isBakongPaymentReady(): bool
    {
        $accountId = $this->bakongSetting('bakong_account_id', 'bakong.account_id');

        return filter_var($this->bakongSetting('bakong_api_enabled', 'bakong.enabled', 'true'), FILTER_VALIDATE_BOOLEAN)
            && $this->bakongApiToken() !== ''
            && preg_match('/^[^@\s]+@[^@\s]+$/', $accountId) === 1;
    }

    protected function bakongApiToken(): string
    {
        // Read the encrypted token directly so verification never depends on
        // a stale or unavailable cache entry after an admin update.
        $encrypted = trim((string) StoreSetting::query()
            ->where('setting_key', 'bakong_api_token_encrypted')
            ->value('setting_value'));

        if ($encrypted === '') {
            $encrypted = trim((string) StoreSetting::get('bakong_api_token_encrypted', ''));
        }

        if ($encrypted !== '') {
            try {
                return trim(Crypt::decryptString($encrypted));
            } catch (\Throwable) {
                // Fall back to the server environment secret when decryption fails.
            }
        }

        return trim((string) config('bakong.api_token', ''));
    }

    protected function bakongApiUrl(): string
    {
        return $this->bakongSetting('bakong_api_url', 'bakong.api_url', 'https://api-bakong.nbc.gov.kh');
    }

    protected function bakongQrExpirySeconds(): int
    {
        $minutes = (int) StoreSetting::get(
            'payment_qr_expires_minutes',
            config('bakong.qr_expires_minutes', 10)
        );

        return max(60, min(3600, $minutes * 60));
    }

    /**
     * Generate a receipt without allowing an email/PDF/database issue to
     * invalidate an order that has already been persisted.
     */
    protected function prepareCheckoutReceipt(Order $order, Payment $payment, bool $sendImmediately): ?Receipt
    {
        try {
            $service = app(PaymentReceiptPdfService::class);

            return $sendImmediately
                ? $service->generateAndSend($order, $payment)
                : $service->getOrCreateReceipt($order, $payment);
        } catch (\Throwable $exception) {
            Log::error('Checkout receipt preparation failed.', [
                'order_number' => $order->order_number,
                'payment_id' => $payment->id,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Keep the client response complete even when receipt persistence is
     * temporarily unavailable. This value is only a display/reference value;
     * payment state remains controlled by the order and payment records.
     */
    protected function fallbackReceiptNumber(string $orderNumber): string
    {
        return 'REC-'.date('Ymd').'-'.strtoupper(substr(hash('sha256', $orderNumber), 0, 8));
    }

    /**
     * Compute CRC-16/CCITT-FALSE (polynomial 0x1021, init 0xFFFF) for EMVCo Bakong KHQR.
     */
    protected function calculateCrc16Ccitt(string $data): string
    {
        $crc = 0xFFFF;
        $length = strlen($data);
        for ($i = 0; $i < $length; $i++) {
            $crc ^= (ord($data[$i]) << 8);
            for ($j = 0; $j < 8; $j++) {
                if (($crc & 0x8000) !== 0) {
                    $crc = (($crc << 1) ^ 0x1021) & 0xFFFF;
                } else {
                    $crc = ($crc << 1) & 0xFFFF;
                }
            }
        }
        return strtoupper(str_pad(dechex($crc), 4, '0', STR_PAD_LEFT));
    }

    /**
     * Build EMVCo Bakong KHQR payload and metadata for QR scan checkout.
     * Fully compliant with National Bank of Cambodia (NBC) KHQR EMVCo standards.
     */
    protected function buildBakongKhqrPayload(string $orderNumber, float $amountUsd, string $txnRef): array
    {
        $merchantAccount = $this->bakongSetting('bakong_account_id', 'bakong.account_id');
        $merchantName = $this->bakongSetting('bakong_merchant_name', 'bakong.merchant_name', 'TYUSHOP');
        $merchantCity = $this->bakongSetting('company_city', 'bakong.merchant_city', 'Phnom Penh');

        // Amount formatting compliant with NBC Bakong EMVCo specification
        $amountStr = (fmod($amountUsd, 1.0) === 0.0)
            ? (string) ((int) round($amountUsd))
            : number_format($amountUsd, 2, '.', '');
        $amountKhr = (int) round($amountUsd * 4100);

        // Tag 29: Individual Merchant Account Information
        // Sub-tag 00: Bakong Account ID only (e.g., username@abaa or username@bakong)
        $tag29Value = '00'.str_pad((string) strlen($merchantAccount), 2, '0', STR_PAD_LEFT).$merchantAccount;
        $tag29 = '29'.str_pad((string) strlen($tag29Value), 2, '0', STR_PAD_LEFT).$tag29Value;

        // Tag 62: Additional Data Field (Sub-tag 01: Bill Number / Order Number)
        $tag62Value = '01'.str_pad((string) strlen($orderNumber), 2, '0', STR_PAD_LEFT).$orderNumber;
        $tag62 = '62'.str_pad((string) strlen($tag62Value), 2, '0', STR_PAD_LEFT).$tag62Value;

        // Tag 99: Bakong National Scheme Timestamp (required for Dynamic QR 010212).
        // NBC's KHQR guideline defines this as sub-tag 00 with one 13-digit
        // creation timestamp. Expiration is enforced by the checkout timer and
        // server-side payment window, not by adding an undocumented sub-tag.
        $creationMs = (string) (time() * 1000);
        $tag99Value = '0013'.$creationMs;
        $tag99 = '99'.str_pad((string) strlen($tag99Value), 2, '0', STR_PAD_LEFT).$tag99Value;

        $emvPayload = '000201'
            .'010212'
            .$tag29
            .'52045999'
            .'5303840'
            .'54'.str_pad((string) strlen($amountStr), 2, '0', STR_PAD_LEFT).$amountStr
            .'5802KH'
            .'59'.str_pad((string) strlen($merchantName), 2, '0', STR_PAD_LEFT).$merchantName
            .'60'.str_pad((string) strlen($merchantCity), 2, '0', STR_PAD_LEFT).$merchantCity
            .$tag62
            .$tag99
            .'6304';

        $crcHex = $this->calculateCrc16Ccitt($emvPayload);
        $fullQrString = $emvPayload.$crcHex;

        return [
            'qr_string' => $fullQrString,
            'md5' => md5($fullQrString),
            'merchant_account' => $merchantAccount,
            'merchant_name' => $merchantName,
            'merchant_city' => $merchantCity,
            'amount_usd' => $amountUsd,
            'amount_khr' => $amountKhr,
            'order_number' => $orderNumber,
            'transaction_reference' => $txnRef,
            'expires_in_seconds' => $this->bakongQrExpirySeconds(),
        ];
    }

    /**
     * Direct 100-point redemption for a free product under $20-$30.
     */
    public function redeemFreeItem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'customer_name' => ['nullable', 'string', 'max:120'],
            'customer_phone' => ['nullable', 'string', 'max:40'],
            'delivery_address' => ['nullable', 'string', 'max:500'],
        ]);

        $user = $request->user('sanctum') ?? $request->user();
        if (! $user) {
            abort(401, 'Authentication is required to redeem loyalty points.');
        }
        $availablePoints = (int) ($user->loyalty_points ?? 0);

        $product = Product::findOrFail($validated['product_id']);
        $effectivePrice = ($product->discount_price !== null && (float) $product->discount_price > 0)
            ? (float) $product->discount_price
            : (float) $product->price;

        if ($effectivePrice > self::FREE_ITEM_MAX_PRICE) {
            return response()->json([
                'status' => 'error',
                'message' => "Product '{$product->name}' (\${$effectivePrice}) exceeds the \$30.00 max price for 100-point free exchange.",
            ], 422);
        }

        if ($availablePoints < self::POINTS_FOR_FREE_ITEM) {
            return response()->json([
                'status' => 'error',
                'message' => "Insufficient points. You have {$availablePoints} points, but 100 points are required to exchange for a free item.",
            ], 422);
        }

        $orderNumber = 'RWD-'.now()->format('Ymd').'-'.strtoupper(Str::random(5));
        $order = Order::create([
            'order_number' => $orderNumber,
            'user_id' => $user->id,
            'status' => 'pending',
            'subtotal' => $effectivePrice,
            'discount' => $effectivePrice,
            'coupon_code' => '100PT-FREE-REWARD',
            'points_earned' => 0,
            'points_redeemed' => self::POINTS_FOR_FREE_ITEM,
            'free_reward_product_id' => $product->id,
            'shipping_fee' => 0.00,
            'tax' => 0.00,
            'total_amount' => 0.00,
            'currency' => 'USD',
            'payment_status' => 'paid',
            'payment_method' => 'loyalty_points',
            'customer_name' => $validated['customer_name'] ?? $user->name,
            'customer_email' => $user->email,
            'customer_phone' => $validated['customer_phone'] ?? $user->phone_number,
            'delivery_address' => $validated['delivery_address'] ?? $user->address,
            'current_lat' => null,
            'current_lng' => null,
            'dest_lat' => null,
            'dest_lng' => null,
            'estimated_arrival' => null,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => '[FREE 100-PT EXCHANGE] '.$product->name,
            'product_sku' => $product->sku,
            'quantity' => 1,
            'unit_price' => 0.00,
            'total_price' => 0.00,
        ]);

        $newPoints = $availablePoints - self::POINTS_FOR_FREE_ITEM;
        if ($user) {
            $user->loyalty_points = $newPoints;
            $user->save();

            DB::table('loyalty_transactions')->insert([
                'user_id' => $user->id,
                'order_id' => $order->id,
                'type' => 'redeemed',
                'points' => -self::POINTS_FOR_FREE_ITEM,
                'description' => "Exchanged 100 points for FREE product: {$product->name} (\${$effectivePrice} value)",
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'status' => 'ok',
            'message' => "Congratulations! You exchanged 100 points for '{$product->name}' ($0.00 FREE)!",
            'data' => [
                'order' => $order->load('items'),
                'points_redeemed' => self::POINTS_FOR_FREE_ITEM,
                'new_loyalty_points' => $newPoints,
                'tracking_url' => "/track-order/{$order->order_number}",
            ],
        ], 201);
    }

    /**
     * Real-time GPS delivery location tracking endpoint.
     */
    public function trackOrder(Request $request, string $orderNumber): JsonResponse
    {
        $order = Order::with('items')
            ->where('order_number', $orderNumber)
            ->first();

        if (! $order) {
            return response()->json([
                'status' => 'error',
                'message' => 'Order not found.',
            ], 404);
        }
        $this->authorizeOrderAccess($request, $order);

        $lat = (float) ($order->current_lat ?? $order->dest_lat ?? 0);
        $lng = (float) ($order->current_lng ?? $order->dest_lng ?? 0);
        $destLat = (float) ($order->dest_lat ?? 0);
        $destLng = (float) ($order->dest_lng ?? 0);
        $paymentStatus = $order->payment_status ?? 'unpaid';
        $paymentMethod = $order->payment_method ?? 'bakong_khqr';
        $totalAmount = (float) $order->total_amount;
        $isCashOnArrival = in_array($paymentMethod, ['cash_on_delivery', 'cash_on_hand'], true)
            && $paymentStatus !== 'paid'
            && $totalAmount > 0;
        $amountDueOnArrival = $isCashOnArrival ? $totalAmount : 0.00;

        // Calculate real distance remaining (Haversine Formula)
        $hasCoordinates = $order->current_lat !== null && $order->current_lng !== null
            && $order->dest_lat !== null && $order->dest_lng !== null;
        $distanceRemainingKm = null;
        if ($hasCoordinates) {
            try {
            $theta = $lng - $destLng;
            $dist = sin(deg2rad($lat)) * sin(deg2rad($destLat)) + cos(deg2rad($lat)) * cos(deg2rad($destLat)) * cos(deg2rad($theta));
            $dist = acos(max(-1, min(1, $dist)));
            $dist = rad2deg($dist) * 60 * 1.1515 * 1.609344;
            $distanceRemainingKm = max(0.1, round($dist, 2));
            } catch (\Throwable $e) {
                $distanceRemainingKm = null;
            }
        }

        $estimatedMins = $distanceRemainingKm !== null
            ? max(2, (int) round(($distanceRemainingKm / 28) * 60))
            : null;
        $etaString = $order->status === 'delivered'
            ? 'Delivered'
            : ($order->estimated_arrival ?: ($estimatedMins !== null ? "{$estimatedMins} mins" : null));

        return response()->json([
            'status' => 'ok',
            'data' => [
                'order_number' => $order->order_number,
                'status' => $order->status,
                'payment_status' => $paymentStatus,
                'payment_method' => $paymentMethod,
                'amount_due_on_arrival' => $amountDueOnArrival,
                'total_amount' => $totalAmount,
                'discount' => (float) ($order->discount ?? 0),
                'points_earned' => (int) ($order->points_earned ?? 0),
                'points_redeemed' => (int) ($order->points_redeemed ?? 0),
                'customer_name' => $order->customer_name,
                'customer_phone' => $order->customer_phone,
                'delivery_address' => $order->delivery_address,
                'driver' => [
                    'name' => $order->driver_name,
                    'phone' => $order->driver_phone,
                    'vehicle' => $order->driver_vehicle,
                    'rating' => 4.95,
                    'verified' => true,
                ],
                'gps' => [
                    'warehouse_lat' => null,
                    'warehouse_lng' => null,
                    'warehouse_name' => null,
                    'current_lat' => $lat,
                    'current_lng' => $lng,
                    'dest_lat' => $destLat,
                    'dest_lng' => $destLng,
                    'estimated_arrival' => $etaString,
                    'distance_remaining_km' => $order->status === 'delivered' ? 0.0 : $distanceRemainingKm,
                    'speed_kmh' => $order->status === 'delivered' ? 0 : null,
                    'updated_at' => now()->toIso8601String(),
                ],
                'checkpoints' => [
                    [
                        'title' => $isCashOnArrival
                            ? 'Order Confirmed • Cash on Hand Upon Arrival ($'.number_format($amountDueOnArrival, 2).')'
                            : 'Order Confirmed & Online Payment Verified',
                        'location' => 'TYUSHOP Checkout',
                        'time' => 'Completed',
                        'done' => true,
                    ],
                    [
                        'title' => 'Warehouse Dispatch',
                        'location' => $order->delivery_address,
                        'time' => $order->status === 'pending' ? 'Waiting for dispatch' : 'Completed',
                        'done' => $order->status !== 'pending',
                        'active' => $order->status === 'pending',
                    ],
                    [
                        'title' => 'Out for Delivery • Live GPS Telemetry',
                        'location' => $order->delivery_address,
                        'time' => $order->status === 'pending' ? 'Not started' : ($order->status === 'delivered' ? 'Delivered' : 'In transit'),
                        'done' => in_array($order->status, ['shipped', 'out_for_delivery', 'delivered'], true),
                        'active' => in_array($order->status, ['shipped', 'out_for_delivery'], true),
                    ],
                    [
                        'title' => ($order->status === 'delivered')
                            ? 'Delivered to Doorstep (Handover Complete)'
                            : ($isCashOnArrival
                                ? 'Arriving at Location • Pay Cash on Hand ($'.number_format($amountDueOnArrival, 2).') to Courier'
                                : 'Arriving at Customer Doorstep'),
                        'location' => $order->delivery_address,
                        'time' => $order->status === 'delivered' ? 'Completed' : ($etaString ?: 'Awaiting ETA'),
                        'done' => $order->status === 'delivered',
                        'active' => $order->status !== 'delivered',
                    ],
                ],
                'items' => $order->items,
            ],
        ]);
    }

    /**
     * Confirm payment completed via Bakong KHQR scan or upon delivery arrival (Cash on Hand).
     */
    public function confirmArrivalPayment(Request $request, string $orderNumber): JsonResponse
    {
        $order = Order::with('items')->where('order_number', $orderNumber)->first();
        if (! $order) {
            return response()->json([
                'status' => 'error',
                'message' => 'Order not found.',
            ], 404);
        }
        $this->authorizeOrderAccess($request, $order);

        // Confirmation is idempotent. Do not resend receipts or award loyalty
        // points when a customer retries after a slow network response.
        if (in_array($order->payment_status, ['paid', 'completed'], true)) {
            return $this->alreadyConfirmedPaymentResponse($order);
        }

        $user = $request->user('sanctum') ?? $request->user();
        $isQrCheckoutConfirm = $order->payment_method === 'bakong_khqr'
            && $order->payment_status === 'pending_qr';

        if (! $isQrCheckoutConfirm) {
            // A customer must never be able to self-confirm cash receipt or
            // mark an order delivered. Only an authorized delivery operator
            // can complete the handover from the delivery dashboard.
            $canConfirmHandover = $user
                && method_exists($user, 'hasAnyRole')
                && $user->hasAnyRole([
                    'SUPER_ADMIN',
                    'ADMIN',
                    'STAFF',
                    'ORDER_MANAGER',
                    'LOGISTICS_MANAGER',
                    'DISPATCHER',
                    'DELIVERY_DRIVER',
                    'COURIER',
                ]);
            if (! $canConfirmHandover) {
                abort(403, 'Only authorized delivery staff can confirm cash handover.');
            }

            $this->authorizeDeliveryOrder($request, $order);
            if ($order->payment_method !== 'cash_on_delivery') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Only cash-on-delivery orders can be confirmed at handover.',
                ], 422);
            }
        }

        $payment = Payment::where('order_id', $order->id)->latest('id')->first();
        $verificationPayload = null;
        $gatewayReference = null;
        if ($isQrCheckoutConfirm) {
            if (! $payment || ! $payment->khqr_md5) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This QR payment is missing verification data. Please create a new checkout.',
                ], 422);
            }

            $qrExpiresAt = $payment->created_at?->copy()->addSeconds($this->bakongQrExpirySeconds());
            if ($qrExpiresAt && now()->greaterThan($qrExpiresAt)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This QR payment has expired. Please create a new checkout.',
                ], 422);
            }

            $apiToken = $this->bakongApiToken();
            if (! filter_var($this->bakongSetting('bakong_api_enabled', 'bakong.enabled', 'true'), FILTER_VALIDATE_BOOLEAN) || $apiToken === '') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Bakong verification is not configured on the server yet.',
                ], 503);
            }

            try {
                $verificationResponse = Http::timeout(12)
                    ->withToken($apiToken)
                    ->post(rtrim($this->bakongApiUrl(), '/').'/v1/check_transaction_by_md5', [
                        'md5' => $payment->khqr_md5,
                    ]);
            } catch (\Throwable $e) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Bakong verification is temporarily unavailable. Please try again.',
                ], 503);
            }

            $verificationPayload = $verificationResponse->json();
            $transaction = is_array($verificationPayload) ? ($verificationPayload['data'] ?? null) : null;
            $expectedMerchant = strtolower($this->bakongSetting('bakong_account_id', 'bakong.account_id'));
            $paidMerchant = strtolower((string) ($transaction['toAccountId'] ?? ''));
            $amountMatches = is_array($transaction)
                && abs((float) ($transaction['amount'] ?? -1) - (float) $order->total_amount) < 0.01;
            $currencyMatches = is_array($transaction)
                && strtoupper((string) ($transaction['currency'] ?? '')) === strtoupper((string) $order->currency);
            $merchantMatches = $expectedMerchant !== '' && $paidMerchant !== '' && hash_equals($expectedMerchant, $paidMerchant);

            if (! $verificationResponse->successful()
                || (int) ($verificationPayload['responseCode'] ?? 1) !== 0
                || ! $amountMatches
                || ! $currencyMatches
                || ! $merchantMatches
            ) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Bakong has not confirmed the exact payment for this order yet.',
                ], 422);
            }

            $gatewayReference = trim((string) ($transaction['hash'] ?? ''));
            if ($gatewayReference !== ''
                && Payment::where('transaction_reference', $gatewayReference)
                    ->where('id', '!=', $payment->id)
                    ->exists()
            ) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This Bakong transaction has already been used for another order.',
                ], 422);
            }
        }

        $newPointsBalance = null;
        $alreadyConfirmedDuringRace = false;

        DB::transaction(function () use (
            &$order,
            &$payment,
            &$newPointsBalance,
            &$alreadyConfirmedDuringRace,
            $isQrCheckoutConfirm,
            $verificationPayload,
            $gatewayReference
        ): void {
            $lockedOrder = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();
            if (in_array($lockedOrder->payment_status, ['paid', 'completed'], true)) {
                $alreadyConfirmedDuringRace = true;
                $order = $lockedOrder->load('items');
                $payment = Payment::where('order_id', $lockedOrder->id)->latest('id')->first();
                return;
            }

            $lockedPayment = Payment::where('order_id', $lockedOrder->id)->latest('id')->lockForUpdate()->firstOrFail();
            if ($isQrCheckoutConfirm) {
                $lockedPayment->gateway_payload = $verificationPayload;
                if ($gatewayReference !== '') {
                    $lockedPayment->transaction_reference = $gatewayReference;
                }
            }
            $lockedPayment->status = 'completed';
            $lockedPayment->verified_at = now();
            $lockedPayment->save();

            $lockedOrder->payment_status = 'paid';
            if (! $isQrCheckoutConfirm) {
                $lockedOrder->status = 'delivered';
            }
            $lockedOrder->save();

            $customer = $lockedOrder->user()->lockForUpdate()->first();
            if ($customer) {
                $earnedAlready = DB::table('loyalty_transactions')
                    ->where('order_id', $lockedOrder->id)
                    ->where('type', 'earned')
                    ->exists();

                if (! $earnedAlready) {
                    $pointsEarned = (int) ($lockedOrder->points_earned ?? self::POINTS_PER_PURCHASE);
                    $customer->increment('loyalty_points', $pointsEarned);
                    DB::table('loyalty_transactions')->insert([
                        'user_id' => $customer->id,
                        'order_id' => $lockedOrder->id,
                        'type' => 'earned',
                        'points' => $pointsEarned,
                        'description' => "Earned +{$pointsEarned} points from Order #{$lockedOrder->order_number}",
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $newPointsBalance = (int) $customer->fresh()->loyalty_points;
            }

            $order = $lockedOrder->load('items');
            $payment = $lockedPayment->fresh();
        });

        if ($alreadyConfirmedDuringRace) {
            return $this->alreadyConfirmedPaymentResponse($order);
        }

        // Dispatch Customer Email Payment Report & Telegram Admin Order/Payment Report
        $receipt = null;
        $telegramNotified = false;
        $receipt = $this->prepareCheckoutReceipt($order, $payment, true);
        if ($receipt) {
            $telegramNotified = app(TelegramService::class)->notifyAdminOrderAndPaymentReport($order, $receipt, $payment);
        }

        return response()->json([
            'status' => 'ok',
            'message' => "Payment verified & confirmed for Order #{$orderNumber}! Receipt emailed to customer and report sent to Telegram Admin.",
            'data' => [
                'order_number' => $order->order_number,
                'order' => $order,
                'receipt_number' => $receipt?->receipt_number ?: $this->fallbackReceiptNumber($order->order_number),
                'transaction_reference' => $payment?->transaction_reference,
                'email_status' => $receipt?->email_status,
                'email_sent_to' => $order->customer_email,
                'telegram_admin_notified' => $telegramNotified,
                'payment_status' => 'paid',
                'amount_due_on_arrival' => 0.00,
                'status' => $order->status,
                'new_loyalty_points' => $newPointsBalance,
            ],
        ]);
    }

    /**
     * Customer Wishlist (Favorites) list & toggle.
     */
    public function wishlist(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        if (! $user) {
            return response()->json([
                'status' => 'ok',
                'data' => [],
            ]);
        }

        $productIds = DB::table('wishlists')
            ->where('user_id', $user->id)
            ->pluck('product_id');

        $products = Product::whereIn('id', $productIds)->get();

        return response()->json([
            'status' => 'ok',
            'data' => $products,
        ]);
    }

    public function toggleWishlist(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $user = $request->user('sanctum');
        if (! $user) {
            return response()->json([
                'status' => 'ok',
                'action' => 'guest_local',
                'message' => 'Saved to your favorites!',
            ]);
        }

        $exists = DB::table('wishlists')
            ->where('user_id', $user->id)
            ->where('product_id', $validated['product_id'])
            ->exists();

        if ($exists) {
            DB::table('wishlists')
                ->where('user_id', $user->id)
                ->where('product_id', $validated['product_id'])
                ->delete();

            return response()->json([
                'status' => 'ok',
                'action' => 'removed',
                'message' => 'Removed from your favorites.',
            ]);
        }

        DB::table('wishlists')->insert([
            'user_id' => $user->id,
            'product_id' => $validated['product_id'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'ok',
            'action' => 'added',
            'message' => 'Added to your favorites!',
        ]);
    }

    /**
     * Submit a Customer Support / Contact Us ticket.
     */
    public function createSupportTicket(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:150'],
            'subject' => ['required', 'string', 'max:200'],
            'category' => ['nullable', 'string', 'max:50'],
            'order_number' => ['nullable', 'string', 'max:60'],
            'message' => ['required', 'string', 'max:3000'],
        ]);

        $ticketNumber = 'SUP-'.now()->format('Ymd').'-'.strtoupper(Str::random(4));
        $user = $request->user('sanctum');

        DB::table('support_tickets')->insert([
            'ticket_number' => $ticketNumber,
            'user_id' => $user ? $user->id : null,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'subject' => $validated['subject'],
            'category' => $validated['category'] ?? 'general',
            'order_number' => $validated['order_number'] ?? null,
            'message' => $validated['message'],
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'ok',
            'message' => "Support Ticket #{$ticketNumber} received! Our 24/7 Cambodia Support Specialist will respond shortly.",
            'data' => [
                'ticket_number' => $ticketNumber,
                'status' => 'open',
            ],
        ], 201);
    }

    /**
     * Instant Supporter Chat Assistant for Customer Help.
     */
    public function supporterChat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:1000'],
        ]);

        $q = strtolower($validated['message']);

        if (str_contains($q, 'point') || str_contains($q, 'free') || str_contains($q, '100') || str_contains($q, 'ពិន្ទុ')) {
            $reply = '🎁 **TYUSHOP Loyalty Rewards**: Every time you place an order, you automatically earn **+5 Points** (`ទិញម្ដងបាន 5 ពិន្ទុ`). Once you reach **100 Points**, you can exchange them for **ANY product priced under $20–$30 (up to $30.00) 100% FREE** in the Cart or Rewards Center!';
        } elseif (str_contains($q, 'discount') || str_contains($q, 'coupon') || str_contains($q, 'code') || str_contains($q, 'promo')) {
            $reply = '🏷️ **Active Discount Codes**: Use **`WELCOME10`** for 10% OFF, **`MEGA20`** for 20% OFF orders over $50, **`KHQR5`** for $5 instant off with Bakong KHQR, or **`VIP30`** for 30% OFF orders over $100!';
        } elseif (str_contains($q, 'track') || str_contains($q, 'delivery') || str_contains($q, 'location') || str_contains($q, 'where')) {
            $reply = '🚚 **Real-Time GPS Delivery Tracking**: Click **Track Delivery** in the top navigation bar (or visit `/track-order`) to watch your driver’s live GPS location on the interactive map, view courier contact details, and see estimated arrival times!';
        } else {
            $reply = '👋 Welcome to **TYUSHOP 24/7 Supporter**! I can help you with:\n• **Loyalty Points**: Earn +5 pts per order, redeem 100 pts for a FREE item under $20–$30\n• **Discount Coupons**: Try `WELCOME10`, `MEGA20`, or `KHQR5` at checkout\n• **Live GPS Tracking**: Watch your courier in real time on `/track-order`\n• **Direct Hotline**: 016 555 637 or submit a ticket on `/contact`.';
        }

        return response()->json([
            'status' => 'ok',
            'data' => [
                'reply' => $reply,
                'timestamp' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * Autonomous Porkbun DNS & SSL Record Provisioner via Porkbun v3 API.
     */
    public function configurePorkbunDns(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'api_key' => ['required', 'string'],
            'secret_api_key' => ['required', 'string'],
            'domain' => ['nullable', 'string'],
        ]);

        $domain = $validated['domain'] ?? 'tyushop.blog';
        $apiKey = trim($validated['api_key']);
        $secretKey = trim($validated['secret_api_key']);
        $baseUrl = 'https://api.porkbun.com/api/json/v3/dns';

        // 1. Retrieve existing DNS records from Porkbun
        $existingResp = Http::timeout(20)->post("{$baseUrl}/retrieve/{$domain}", [
            'apikey' => $apiKey,
            'secretapikey' => $secretKey,
        ]);

        if (! $existingResp->successful() || ($existingResp->json('status') !== 'SUCCESS')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Porkbun API authentication failed: '.($existingResp->json('message') ?? $existingResp->body()),
            ], 422);
        }

        $deletedIds = [];
        foreach ($existingResp->json('records', []) as $rec) {
            $content = (string) ($rec['content'] ?? '');
            $type = (string) ($rec['type'] ?? '');
            $name = (string) ($rec['name'] ?? '');

            // Remove Porkbun parking records (pixie.porkbun.com or 207.207.210.x or conflicting CNAMEs)
            if (
                str_contains($content, 'porkbun.com') ||
                str_starts_with($content, '207.207.210.') ||
                in_array($name, [$domain, "*.{$domain}", "www.{$domain}", "api.{$domain}", "n8n.{$domain}"], true) &&
                in_array($type, ['A', 'ALIAS', 'CNAME'], true)
            ) {
                Http::timeout(15)->post("{$baseUrl}/delete/{$domain}/{$rec['id']}", [
                    'apikey' => $apiKey,
                    'secretapikey' => $secretKey,
                ]);
                $deletedIds[] = $rec['id'];
            }
        }

        // 2. Create all 8 required Railway DNS & SSL verification records
        $desiredRecords = [
            ['name' => '', 'type' => 'ALIAS', 'content' => 'fz1rhfis.up.railway.app', 'ttl' => '600'],
            ['name' => 'www', 'type' => 'CNAME', 'content' => 'h38ojfga.up.railway.app', 'ttl' => '600'],
            ['name' => 'api', 'type' => 'CNAME', 'content' => 'opnnxust.up.railway.app', 'ttl' => '600'],
            ['name' => 'n8n', 'type' => 'CNAME', 'content' => 'oj5k6jz0.up.railway.app', 'ttl' => '600'],
            ['name' => '_railway-verify', 'type' => 'TXT', 'content' => 'railway-verify=19f71e1f903df70927c689cf706ae933ba5cfa420a24f1ffd7180b2199b508f7', 'ttl' => '600'],
            ['name' => '_railway-verify.www', 'type' => 'TXT', 'content' => 'railway-verify=998cd356b5f5504e6fb35fa629f09980935d66ca1ae837689c621fe8b14e84ef', 'ttl' => '600'],
            ['name' => '_railway-verify.api', 'type' => 'TXT', 'content' => 'railway-verify=b0e8dd6ac4e14aad00162e6fa7843bb0e983db2c2a1a2154e7fb3b933449e53a', 'ttl' => '600'],
            ['name' => '_railway-verify.n8n', 'type' => 'TXT', 'content' => 'railway-verify=8f19bddb5c23dee256cf3b129e2d00eaeec18373b4b577bcd751ebf943fa2c84', 'ttl' => '600'],
        ];

        $created = [];
        foreach ($desiredRecords as $rec) {
            $res = Http::timeout(15)->post("{$baseUrl}/create/{$domain}", array_merge([
                'apikey' => $apiKey,
                'secretapikey' => $secretKey,
            ], $rec));
            $created[] = [
                'name' => $rec['name'] ?: '@',
                'type' => $rec['type'],
                'status' => $res->json('status', 'UNKNOWN'),
            ];
        }

        return response()->json([
            'status' => 'ok',
            'message' => 'Successfully removed '.count($deletedIds)." parked records and provisioned all 8 Railway DNS & SSL verification records for {$domain}!",
            'data' => [
                'deleted_record_ids' => $deletedIds,
                'created_records' => $created,
            ],
        ]);
    }

    /**
     * List all dispatch orders for Staff & Delivery Fleet location management.
     */
    public function deliveryOrders(Request $request): JsonResponse
    {
        $this->authorizeDeliveryStaff($request);

        $user = $request->user('sanctum') ?? $request->user();
        $ordersQuery = Order::with(['items', 'driver:id,name,email,phone_number'])
            ->orderBy('id', 'desc')
            ->take(30);

        if ($user && $user->hasRole(['DELIVERY_DRIVER', 'COURIER']) && ! $user->hasRole(['SUPER_ADMIN', 'ADMIN'])) {
            $ordersQuery->where('driver_id', $user->id);
        }

        $orders = $ordersQuery->get();

        return response()->json([
            'status' => 'ok',
            'data' => $orders,
            'summary' => [
                'total_orders' => $orders->count(),
                'in_transit' => $orders->whereIn('status', ['shipped', 'out_for_delivery'])->count(),
                'delivered' => $orders->where('status', 'delivered')->count(),
                'pending' => $orders->where('status', 'pending')->count(),
            ],
        ]);
    }

    /**
     * Update customer delivery destination coordinates or courier location.
     */
    public function updateDeliveryLocation(Request $request, string $orderNumber): JsonResponse
    {
        $this->authorizeDeliveryStaff($request);

        $order = Order::where('order_number', $orderNumber)->first();
        if (! $order) {
            return response()->json([
                'status' => 'error',
                'message' => 'Order not found.',
            ], 404);
        }
        $this->authorizeDeliveryOrder($request, $order);

        $validated = $request->validate([
            'delivery_address' => ['nullable', 'string', 'max:500'],
            'dest_lat' => ['nullable', 'numeric'],
            'dest_lng' => ['nullable', 'numeric'],
            'current_lat' => ['nullable', 'numeric'],
            'current_lng' => ['nullable', 'numeric'],
            'estimated_arrival' => ['nullable', 'string', 'max:60'],
            'driver_name' => ['nullable', 'string', 'max:120'],
            'driver_phone' => ['nullable', 'string', 'max:60'],
            'driver_vehicle' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'in:pending,confirmed,processing,shipped,out_for_delivery,delivered,cancelled'],
        ]);

        if (isset($validated['status']) && $validated['status'] !== $order->status) {
            $transitionError = $this->deliveryStatusTransitionError($request, $order, $validated['status']);
            if ($transitionError) {
                return response()->json([
                    'status' => 'error',
                    'message' => $transitionError,
                ], 422);
            }
        }

        foreach ($validated as $field => $val) {
            if ($val !== null) {
                $order->{$field} = $val;
            }
        }
        $order->save();

        return response()->json([
            'status' => 'ok',
            'message' => "Location updated for Order #{$order->order_number}!",
            'data' => $order->fresh()->load('items'),
        ]);
    }

    /**
     * Update delivery progress status (e.g. out_for_delivery, delivered).
     */
    public function updateDeliveryStatus(Request $request, string $orderNumber): JsonResponse
    {
        $this->authorizeDeliveryStaff($request);

        $order = Order::where('order_number', $orderNumber)->first();
        if (! $order) {
            return response()->json([
                'status' => 'error',
                'message' => 'Order not found.',
            ], 404);
        }
        $this->authorizeDeliveryOrder($request, $order);

        $validated = $request->validate([
            'status' => ['required', 'in:pending,confirmed,processing,shipped,out_for_delivery,delivered,cancelled'],
        ]);
        $status = $validated['status'];

        $transitionError = $this->deliveryStatusTransitionError($request, $order, $status);
        if ($transitionError) {
            return response()->json([
                'status' => 'error',
                'message' => $transitionError,
            ], 422);
        }

        if ($status === 'delivered' && $order->payment_status === 'pending_qr') {
            return response()->json([
                'status' => 'error',
                'message' => 'Verify the online payment before marking this order delivered.',
            ], 422);
        }
        $order->status = $status;
        if ($status === 'delivered' && in_array($order->payment_method, ['cash_on_delivery', 'cash_on_hand'], true)) {
            $order->payment_status = 'paid';
            Payment::where('order_id', $order->id)->update([
                'status' => 'completed',
                'verified_at' => now(),
            ]);
        }
        $order->save();

        return response()->json([
            'status' => 'ok',
            'message' => "Order #{$order->order_number} marked as {$status}.",
            'data' => $order->fresh(),
        ]);
    }

    /**
     * Broadcast driver's real-time device GPS coordinates to active orders.
     */
    public function broadcastDriverGps(Request $request): JsonResponse
    {
        $this->authorizeDeliveryStaff($request);

        $validated = $request->validate([
            'latitude' => ['required', 'numeric'],
            'longitude' => ['required', 'numeric'],
            'order_number' => ['required', 'string', 'exists:orders,order_number'],
            'driver_name' => ['nullable', 'string', 'max:120'],
        ]);

        $lat = (float) $validated['latitude'];
        $lng = (float) $validated['longitude'];

        $order = Order::where('order_number', $validated['order_number'])
            ->whereIn('status', ['shipped', 'out_for_delivery'])
            ->first();
        if (! $order) {
            return response()->json([
                'status' => 'error',
                'message' => 'The selected order is not currently in delivery.',
            ], 422);
        }
        $this->authorizeDeliveryOrder($request, $order);

        $order->current_lat = $lat;
        $order->current_lng = $lng;
        if (! empty($validated['driver_name'])) {
            $order->driver_name = $validated['driver_name'];
        }
        $order->save();

        return response()->json([
            'status' => 'ok',
            'message' => "Live GPS coordinates ({$lat}, {$lng}) broadcast for Order #{$order->order_number}.",
            'data' => [
                'current_lat' => $lat,
                'current_lng' => $lng,
                'order_number' => $order->order_number,
                'broadcast_at' => now()->toIso8601String(),
            ],
        ]);
    }

    protected function authorizeOrderAccess(Request $request, Order $order): void
    {
        $user = $request->user('sanctum') ?? $request->user();
        if (! $user) {
            abort(401, 'Authentication is required to access this order.');
        }

        $isStaff = method_exists($user, 'hasAnyRole')
            && $user->hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT', 'LOGISTICS_MANAGER', 'DISPATCHER']);
        $isAssignedDriver = $user->hasRole(['DELIVERY_DRIVER', 'COURIER'])
            && (int) $order->driver_id === (int) $user->id;
        if (! $isStaff && ! $isAssignedDriver && ((int) $order->user_id !== (int) $user->id)) {
            abort(403, 'You do not have access to this order.');
        }
    }

    protected function deliveryStatusTransitionError(Request $request, Order $order, string $status): ?string
    {
        if ($status === $order->status) {
            return null;
        }

        $user = $request->user('sanctum') ?? $request->user();
        $isDriver = $user && $user->hasRole(['DELIVERY_DRIVER', 'COURIER']);
        $isSupervisor = $user && $user->hasRole([
            'SUPER_ADMIN',
            'ADMIN',
            'STAFF',
            'ORDER_MANAGER',
            'LOGISTICS_MANAGER',
            'DISPATCHER',
        ]);

        // Keep the customer-facing lifecycle monotonic. A driver can accept a
        // prepared order, start the route, and complete the handover. Staff
        // can prepare/dispatch, but only an assigned driver (or supervisor)
        // can move a parcel through the live delivery steps.
        $allowedNextStatuses = match ($order->status) {
            'pending', 'confirmed' => $isDriver ? ['shipped'] : ['processing', 'shipped', 'cancelled'],
            'processing' => $isDriver ? ['shipped'] : ['shipped', 'cancelled'],
            'shipped' => $isDriver || $isSupervisor ? ['out_for_delivery', 'delivered'] : [],
            'out_for_delivery' => $isDriver || $isSupervisor ? ['delivered'] : [],
            default => [],
        };

        if (! in_array($status, $allowedNextStatuses, true)) {
            return "Order #{$order->order_number} cannot move from {$order->status} to {$status} in the current workflow.";
        }

        return null;
    }

    protected function authorizeDeliveryStaff(Request $request): void
    {
        $user = $request->user('sanctum') ?? $request->user();
        if (! $user) {
            abort(401, 'Authentication is required for delivery operations.');
        }

        $allowed = method_exists($user, 'hasAnyRole')
            && $user->hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'ORDER_MANAGER', 'LOGISTICS_MANAGER', 'DISPATCHER', 'DELIVERY_DRIVER', 'COURIER']);
        if (! $allowed) {
            abort(403, 'Delivery staff privileges are required for this operation.');
        }
    }

    protected function authorizeDeliveryOrder(Request $request, Order $order): void
    {
        $user = $request->user('sanctum') ?? $request->user();
        if (! $user) {
            abort(401, 'Authentication is required for delivery operations.');
        }

        $isDriver = $user->hasRole(['DELIVERY_DRIVER', 'COURIER']);
        $isSupervisor = $user->hasRole(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'ORDER_MANAGER', 'LOGISTICS_MANAGER', 'DISPATCHER']);
        if ($isDriver && ! $isSupervisor && (int) $order->driver_id !== (int) $user->id) {
            abort(403, 'This order is not assigned to your delivery route.');
        }
    }
}
