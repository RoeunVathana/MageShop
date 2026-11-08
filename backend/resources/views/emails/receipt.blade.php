<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment Receipt for Order #{{ $order->order_number }}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px; color: #1f2937;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; padding: 24px;">
        <h2 style="color: #4f46e5; margin-top: 0;">Payment Confirmed! 🎉</h2>
        <p>Dear {{ $order->shipping_full_name }},</p>
        <p>Thank you for your order at <strong>{{ $store['store_name'] ?? 'MegaCommerce' }}</strong>! Your Bakong KHQR payment of <strong>${{ number_format($order->total_amount, 2) }}</strong> has been verified and settled.</p>

        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Order Number:</strong> #{{ $order->order_number }}</p>
            <p style="margin: 0 0 8px 0;"><strong>Receipt Number:</strong> #{{ $receipt->receipt_number }}</p>
            <p style="margin: 0 0 8px 0;"><strong>Payment Method:</strong> Bakong KHQR</p>
            <p style="margin: 0;"><strong>Fulfillment Status:</strong> {{ ucfirst($order->status) }}</p>
        </div>

        <h3>Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="border-bottom: 1px solid #e5e7eb; text-align: left;">
                    <th style="padding: 8px 0;">Item</th>
                    <th style="padding: 8px 0; text-align: center;">Qty</th>
                    <th style="padding: 8px 0; text-align: right;">Price</th>
                </tr>
            </thead>
            <tbody>
                @foreach($order->items as $item)
                <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 8px 0;">{{ $item->product_name }}</td>
                    <td style="padding: 8px 0; text-align: center;">{{ $item->quantity }}</td>
                    <td style="padding: 8px 0; text-align: right;">${{ number_format($item->total_price, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <p style="text-align: right; font-size: 16px; font-weight: bold; margin-bottom: 24px;">
            Total Paid: ${{ number_format($order->total_amount, 2) }} {{ $order->currency }}
        </p>

        <p style="font-size: 13px; color: #6b7280;">
            Your official PDF receipt is attached to this email. You can also view and track your delivery in real-time inside the MegaCommerce Telegram Mini App.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
            {{ $store['store_name'] ?? 'MegaCommerce' }} • {{ $store['store_address'] ?? 'Phnom Penh, Cambodia' }}<br/>
            Need help? Contact <a href="mailto:{{ $store['support_email'] ?? 'support@megacommerce.local' }}">{{ $store['support_email'] ?? 'support@megacommerce.local' }}</a>
        </p>
    </div>
</body>
</html>

