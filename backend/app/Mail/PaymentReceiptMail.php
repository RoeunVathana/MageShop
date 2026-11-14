<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\StoreSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public Order $order;

    public Receipt $receipt;

    public ?Payment $payment;

    public ?string $pdfRawBytes;

    public function __construct(
        Order $order,
        Receipt $receipt,
        ?Payment $payment,
        ?string $pdfRawBytes = null
    ) {
        $this->order = $order;
        $this->receipt = $receipt;
        $this->payment = $payment;
        $this->pdfRawBytes = $pdfRawBytes;
    }

    public function envelope(): Envelope
    {
        $storeName = StoreSetting::get('store_name', 'TYUSHOP');

        return new Envelope(
            null,
            [],
            [],
            [],
            [],
            "{$storeName} — Payment Receipt #{$this->receipt->receipt_number}"
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
                'isOrderConfirmation' => false,
                'trackingKey' => $trackingKey,
                'trackingUrl' => $trackingUrl,
            ]
        );
    }

    public function attachments(): array
    {
        if ($this->pdfRawBytes) {
            return [
                Attachment::fromData(fn () => $this->pdfRawBytes, "receipt-{$this->receipt->receipt_number}.pdf")
                    ->withMime('application/pdf'),
            ];
        }

        return [];
    }
}
