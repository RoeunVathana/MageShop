<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Receipt #{{ $receipt->receipt_number }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1f2937;
            margin: 0;
            padding: 30px;
            font-size: 13px;
            line-height: 1.5;
        }
        .header-table {
            width: 100%;
            margin-bottom: 25px;
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 15px;
        }
        .store-title {
            font-size: 22px;
            font-weight: bold;
            color: #4f46e5;
            margin: 0 0 5px 0;
        }
        .receipt-badge {
            display: inline-block;
            background: #e0e7ff;
            color: #3730a3;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 4px;
            text-transform: uppercase;
        }
        .info-grid {
            width: 100%;
            margin-bottom: 25px;
        }
        .info-grid td {
            vertical-align: top;
            width: 50%;
        }
        .info-box-title {
            font-size: 11px;
            font-weight: bold;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }
        .items-table th {
            background-color: #f3f4f6;
            color: #374151;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        .items-table td {
            padding: 10px;
            border-bottom: 1px solid #f3f4f6;
        }
        .items-table .text-right {
            text-align: right;
        }
        .totals-table {
            width: 45%;
            margin-left: auto;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .totals-table td {
            padding: 6px 10px;
        }
        .totals-table .total-row {
            font-size: 15px;
            font-weight: bold;
            color: #111827;
            border-top: 2px solid #e5e7eb;
        }
        .payment-box {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 25px;
        }
        .footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
            font-size: 11px;
            color: #6b7280;
            text-align: center;
        }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td>
                <div class="store-title">{{ $store['store_name'] ?? 'TYUSHOP' }}</div>
                <div style="color: #6b7280;">{{ $store['store_address'] ?? 'Phnom Penh, Cambodia' }}</div>
                <div style="color: #6b7280;">Email: {{ $store['support_email'] ?? 'support@megacommerce.local' }} | Tel: {{ $store['contact_phone'] ?? '+855 (23) 998-888' }}</div>
                @if(!empty($store['tax_id']))
                <div style="color: #9ca3af; font-size: 11px;">VAT / Tax ID: {{ $store['tax_id'] }}</div>
                @endif
            </td>
            <td style="text-align: right; vertical-align: top;">
                <div class="receipt-badge">Official Payment Receipt</div>
                <div style="font-size: 16px; font-weight: bold; margin-top: 8px;">#{{ $receipt->receipt_number }}</div>
                <div style="color: #6b7280; font-size: 12px;">Date: {{ $order->created_at->format('M d, Y H:i') }} UTC</div>
                <div style="color: #6b7280; font-size: 12px;">Order Ref: <strong>#{{ $order->order_number }}</strong></div>
            </td>
        </tr>
    </table>

    <table class="info-grid">
        <tr>
            <td>
                <div class="info-box-title">Billed & Shipped To</div>
                <div style="font-weight: bold;">{{ $order->shipping_full_name }}</div>
                <div>{{ $order->shipping_address_line1 }}</div>
                @if($order->shipping_address_line2)
                <div>{{ $order->shipping_address_line2 }}</div>
                @endif
                <div>{{ $order->shipping_city }}, {{ $order->shipping_country }}</div>
                <div>Phone: {{ $order->shipping_phone }}</div>
                <div>Email: {{ $order->shipping_email }}</div>
            </td>
            <td>
                <div class="info-box-title">Payment & Fulfillment</div>
                <div>Payment Method: <strong>{{ strtoupper($order->payment_method) }} (Bakong KHQR)</strong></div>
                <div>Payment Status: <strong style="color: #059669;">PAID</strong></div>
                <div>Delivery Method: {{ $order->shipping_method }}</div>
                @if($order->tracking_number)
                <div>Carrier Tracking: <code>{{ $order->tracking_number }}</code></div>
                @endif
            </td>
        </tr>
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th>Item Description</th>
                <th>SKU</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Line Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order->items as $item)
            <tr>
                <td><strong>{{ $item->product_name }}</strong></td>
                <td><code style="color: #6b7280;">{{ $item->sku }}</code></td>
                <td class="text-right">${{ number_format($item->unit_price, 2) }}</td>
                <td class="text-right">{{ $item->quantity }}</td>
                <td class="text-right"><strong>${{ number_format($item->total_price, 2) }}</strong></td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals-table">
        <tr>
            <td style="color: #6b7280;">Subtotal:</td>
            <td class="text-right">${{ number_format($order->subtotal, 2) }}</td>
        </tr>
        <tr>
            <td style="color: #6b7280;">Shipping & Handling:</td>
            <td class="text-right">${{ number_format($order->shipping_fee, 2) }}</td>
        </tr>
        @if($order->discount_amount > 0)
        <tr>
            <td style="color: #059669;">Promotional Discount:</td>
            <td class="text-right" style="color: #059669;">-${{ number_format($order->discount_amount, 2) }}</td>
        </tr>
        @endif
        <tr class="total-row">
            <td>Total Settled:</td>
            <td class="text-right" style="color: #4f46e5;">${{ number_format($order->total_amount, 2) }} {{ $order->currency }}</td>
        </tr>
    </table>

    @if($payment)
    <div class="payment-box">
        <div class="info-box-title">Bakong KHQR Transaction Details</div>
        <div>Transaction Reference: <code>{{ $payment->transaction_reference }}</code></div>
        @if($payment->bakong_hash)
        <div>NBC Bakong Hash: <code>{{ $payment->bakong_hash }}</code></div>
        @endif
        <div>Settled Amount: <strong>${{ number_format($payment->amount, 2) }} {{ $payment->currency }}</strong> at {{ $payment->paid_at ? $payment->paid_at->format('Y-m-d H:i:s') : 'N/A' }}</div>
    </div>
    @endif

    <div class="footer">
        <div>{{ $store['receipt_footer_message'] ?? 'Thank you for shopping with TYUSHOP Flagship.' }}</div>
        <div>Return window: {{ $store['return_policy_days'] ?? 7 }} days from delivery date in accordance with store policies.</div>
    </div>

</body>
</html>

