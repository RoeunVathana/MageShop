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

    public function __construct(
        public Order $order,
        public Receipt $receipt,
        public ?Payment $payment,
        public ?string $pdfRawBytes = null
    ) {}

    public function envelope(): Envelope
    {
        $storeName = StoreSetting::get('store_name', 'MegaCommerce');

        return new Envelope(
            subject: "{$storeName} — Payment Receipt #{$this->receipt->receipt_number}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.receipt',
            with: [
                'order' => $this->order,
                'receipt' => $this->receipt,
                'payment' => $this->payment,
                'store' => StoreSetting::getAll(),
            ],
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
