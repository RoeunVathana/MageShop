<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\StoreSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Order $order,
        public Receipt $receipt,
        public ?Payment $payment = null,
    ) {
    }

    public function envelope(): Envelope
    {
        $storeName = StoreSetting::get('store_name', 'TYUSHOP');

        return new Envelope(
            subject: "{$storeName} — Order Confirmation #{$this->order->order_number}"
        );
    }

    public function content(): Content
    {
        $trackingKey = (string) $this->order->order_number;
        $trackingUrl = rtrim(
            (string) config('app.frontend_url', config('app.url', 'https://www.tyushop.blog')),
            '/'
        ).'/track-order/'.rawurlencode($trackingKey);

        return new Content(
            view: 'emails.receipt',
            with: [
                'order' => $this->order,
                'receipt' => $this->receipt,
                'payment' => $this->payment,
                'store' => StoreSetting::getAll(),
                'isOrderConfirmation' => true,
                'trackingKey' => $trackingKey,
                'trackingUrl' => $trackingUrl,
            ],
        );
    }
}
