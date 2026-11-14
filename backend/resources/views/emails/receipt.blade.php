<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ ($isOrderConfirmation ?? false) ? 'Order Confirmation' : 'Payment Confirmation' }} #{{ $receipt->receipt_number }} — {{ $store['store_name'] ?? 'TYUSHOP' }}</title>
</head>
<body style="font-family: 'Khmer OS Battambang', 'Battambang', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #0f172a;">
    @php
        $isOrderConfirmation = $isOrderConfirmation ?? false;
        $trackingKey = $trackingKey ?? $order->order_number;
        $trackingUrl = $trackingUrl ?? rtrim(config('app.frontend_url', config('app.url', 'https://www.tyushop.blog')), '/').'/track-order/'.rawurlencode($trackingKey);
        $paymentStatus = strtolower((string) ($order->payment_status ?? 'pending'));
        $isPaid = in_array($paymentStatus, ['paid', 'completed'], true);
    @endphp
    <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);">
        <!-- Top Brand Banner -->
        <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 50%, #4f46e5 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
            <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px;">
                @if($isOrderConfirmation)
                    📦 ORDER RECEIVED • ការបញ្ជាទិញបានទទួល
                @elseif($isPaid)
                    ✅ PAYMENT SUCCESSFUL • ការទូទាត់ប្រាក់ជោគជ័យ
                @else
                    📦 ORDER CONFIRMED • ការបញ្ជាទិញត្រូវបានបញ្ជាក់
                @endif
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">{{ $store['store_name'] ?? 'TYUSHOP' }} {{ $isOrderConfirmation ? 'Order Confirmation' : 'Official Payment Report' }}</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.92;">
                Order #{{ $order->order_number }} • Receipt #{{ $receipt->receipt_number }}
            </p>
        </div>

        <div style="padding: 28px 24px;">
            <p style="margin-top: 0; font-size: 15px;">Dear <strong>{{ $order->shipping_full_name }}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Thank you for shopping at <strong>{{ $store['store_name'] ?? 'TYUSHOP' }}</strong>! Your order for
                <strong style="color: #059669;">${{ number_format($order->total_amount, 2) }} USD</strong>
                (≈ <strong>{{ number_format(round($order->total_amount * 4100)) }} ៛ KHR</strong>) has been received. Below is your complete order, payment, and delivery report.
            </p>

            <!-- Payment & Customer Metadata Grid -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 12px; margin: 20px 0; font-size: 13px; line-height: 1.7;">
                <p style="margin: 0 0 6px 0;"><strong>🧾 Order Number:</strong> #{{ $order->order_number }}</p>
                <p style="margin: 0 0 6px 0;"><strong>📄 Receipt Number:</strong> #{{ $receipt->receipt_number }}</p>
                <p style="margin: 0 0 6px 0;"><strong>🔑 Tracking Key:</strong> <code>{{ $trackingKey }}</code></p>
                @if($payment && $payment->transaction_reference)
                <p style="margin: 0 0 6px 0;"><strong>🔐 Transaction Ref:</strong> {{ $payment->transaction_reference }}</p>
                @endif
                <p style="margin: 0 0 6px 0;"><strong>💳 Payment Method:</strong> {{ strtoupper(str_replace('_', ' ', $order->payment_method ?? 'BAKONG KHQR')) }}</p>
                <p style="margin: 0 0 6px 0;"><strong>✅ Payment Status:</strong> <span style="color: {{ $isPaid ? '#059669' : '#d97706' }}; font-weight: bold;">{{ strtoupper($order->payment_status ?? 'PENDING') }}</span></p>
                <p style="margin: 0 0 6px 0;"><strong>🚚 Delivery Status:</strong> {{ strtoupper(str_replace('_', ' ', $order->status ?? 'PENDING')) }}</p>
                <p style="margin: 0 0 6px 0;"><strong>👤 Customer:</strong> {{ $order->shipping_full_name }} ({{ $order->shipping_phone }})</p>
                <p style="margin: 0 0 6px 0;"><strong>✉️ Customer Email:</strong> {{ $order->shipping_email }}</p>
                <p style="margin: 0 0 6px 0;"><strong>📍 Delivery Address:</strong> {{ $order->shipping_address_line1 }}</p>
                <p style="margin: 0;"><strong>🎁 Loyalty Reward Earned:</strong> <span style="color: #4f46e5; font-weight: bold;">+{{ $order->points_earned ?? 5 }} Points</span></p>
            </div>

            <!-- Itemized Breakdown -->
            <h3 style="font-size: 16px; margin: 24px 0 12px 0; color: #0f172a;">📦 Purchased Items Summary</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 14px;">
                <thead>
                    <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569;">
                        <th style="padding: 10px 4px;">Product</th>
                        <th style="padding: 10px 4px; text-align: center;">Qty</th>
                        <th style="padding: 10px 4px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($order->items as $item)
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 4px; font-weight: 600; color: #1e293b;">{{ $item->product_name }}</td>
                        <td style="padding: 10px 4px; text-align: center; color: #475569;">x{{ $item->quantity }}</td>
                        <td style="padding: 10px 4px; text-align: right; font-weight: 700; color: #0f172a;">${{ number_format($item->total_price, 2) }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>

            <!-- Totals Box -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; text-align: right; margin-bottom: 24px;">
                @if(($order->discount ?? 0) > 0)
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #059669;">
                    Discount Applied {{ $order->coupon_code ? '('.$order->coupon_code.')' : '' }}: -${{ number_format($order->discount, 2) }}
                </p>
                @endif
                <p style="margin: 0; font-size: 18px; font-weight: 800; color: #065f46;">
                    {{ $isPaid ? 'Total Paid' : 'Total Order Amount' }}: ${{ number_format($order->total_amount, 2) }} {{ $order->currency ?? 'USD' }}
                    <span style="font-size: 13px; font-weight: 600; color: #047857;">(≈ {{ number_format(round($order->total_amount * 4100)) }} ៛)</span>
                </p>
            </div>

            <!-- Live GPS Tracking Call To Action -->
            <div style="text-align: center; margin: 26px 0;">
                <p style="font-size: 13px; color: #334155; margin: 0 0 10px 0;"><strong>Your tracking key:</strong> <code>{{ $trackingKey }}</code></p>
                <a href="{{ $trackingUrl }}"
                   style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 10px;">
                    🚚 Track Your Live GPS Delivery Now
                </a>
                <p style="font-size: 11px; color: #64748b; margin: 10px 0 0 0; word-break: break-all;">{{ $trackingUrl }}</p>
            </div>

            <p style="font-size: 13px; color: #64748b; text-align: center; margin-bottom: 0;">
                {{ $isOrderConfirmation ? 'Keep this email and use the tracking key above to follow your delivery.' : 'Your official PDF receipt is attached to this email for your records.' }}
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.6;">
                <strong>{{ $store['store_name'] ?? 'TYUSHOP' }}</strong> • {{ $store['store_address'] ?? 'Phnom Penh, Cambodia' }}<br/>
                24/7 Customer Support Hotline: <strong>016 555 637</strong> •
                <a href="mailto:{{ $store['support_email'] ?? 'Vothanarern@gmail.com' }}" style="color: #4f46e5;">{{ $store['support_email'] ?? 'Vothanarern@gmail.com' }}</a>
            </p>
        </div>
    </div>
</body>
</html>
