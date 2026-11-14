<?php

namespace App\Services\Receipt;

use App\Mail\OrderConfirmationMail;
use App\Mail\PaymentReceiptMail;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\StoreSetting;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\View;

class PaymentReceiptPdfService
{
    /**
     * Apply dynamic SMTP settings stored in `store_settings` table by Admin Security Console.
     */
    protected function applyDynamicMailSettings(): void
    {
        try {
            $host = StoreSetting::get('mail_host');
            if (! empty($host)) {
                Config::set('mail.default', StoreSetting::get('mail_mailer', config('mail.default', 'smtp')));
                Config::set('mail.mailers.smtp.host', $host);
                Config::set('mail.mailers.smtp.port', (int) StoreSetting::get('mail_port', 587));
                Config::set('mail.mailers.smtp.username', StoreSetting::get('mail_username'));
                $password = StoreSetting::get('mail_password');
                if (! empty($password)) {
                    Config::set('mail.mailers.smtp.password', $password);
                }
                $encryption = StoreSetting::get('mail_encryption');
                if ($encryption !== null) {
                    Config::set('mail.mailers.smtp.encryption', $encryption === '' ? null : $encryption);
                }
                $fromAddress = StoreSetting::get('mail_from_address');
                if (! empty($fromAddress)) {
                    Config::set('mail.from.address', $fromAddress);
                }
                $fromName = StoreSetting::get('mail_from_name');
                if (! empty($fromName)) {
                    Config::set('mail.from.name', $fromName);
                }
            }
        } catch (\Throwable $e) {
            // Fallback to default config/mail.php
        }
    }

    /**
     * Get or create a Receipt model for an order.
     */
    public function getOrCreateReceipt(Order $order, ?Payment $payment = null): Receipt
    {
        $existing = Receipt::where('order_id', $order->id)->first();
        if ($existing) {
            return $existing;
        }

        $receiptNumber = 'REC-'.date('Ymd').'-'.strtoupper(substr(uniqid(), -5));

        $latestPayment = $payment ?: $order->payments()->latest()->first();

        return Receipt::create([
            'order_id' => $order->id,
            'payment_id' => $latestPayment ? $latestPayment->id : null,
            'receipt_number' => $receiptNumber,
            'email_status' => 'pending',
            'issued_at' => now(),
        ]);
    }

    /**
     * Render receipt HTML view.
     */
    public function renderHtml(Order $order, Receipt $receipt, ?Payment $payment = null): string
    {
        $order->loadMissing('items', 'customer');
        $payment = $payment ?? $order->payments()->latest()->first();
        $store = StoreSetting::getAll();

        return View::make('receipts.pdf', [
            'order' => $order,
            'receipt' => $receipt,
            'payment' => $payment,
            'store' => $store,
            'trackingKey' => (string) $order->order_number,
            'trackingUrl' => rtrim(
                (string) config('app.frontend_url', config('app.url', 'https://www.tyushop.blog')),
                '/'
            ).'/track-order/'.rawurlencode((string) $order->order_number),
        ])->render();
    }

    /**
     * Generate PDF byte stream using Dompdf.
     */
    public function generatePdfBytes(Order $order, Receipt $receipt, ?Payment $payment = null): string
    {
        $html = $this->renderHtml($order, $receipt, $payment);

        $options = new Options;
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', true);
        $options->set('defaultFont', 'Helvetica');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    /**
     * Generate, store on disk, and dispatch email receipt to the customer.
     */
    public function generateAndSend(Order $order, ?Payment $payment = null): Receipt
    {
        $this->applyDynamicMailSettings();
        $receipt = $this->getOrCreateReceipt($order, $payment);
        $payment = $payment ?? $order->payments()->latest()->first();
        $pdfBytes = null;

        try {
            $pdfBytes = $this->generatePdfBytes($order, $receipt, $payment);

            // Store PDF to receipts directory
            $fileName = "receipts/receipt-{$receipt->receipt_number}.pdf";
            Storage::disk(config('filesystems.default', 'local'))->put($fileName, $pdfBytes);

            $receipt->update([
                'receipt_file_path' => $fileName,
            ]);
        } catch (\Throwable $e) {
            Log::warning("Non-fatal PDF storage warning for order #{$order->order_number}: {$e->getMessage()}");
        }

        try {
            $recipientEmail = $order->shipping_email ?: $order->customer_email;
            if (! empty($recipientEmail)) {
                Mail::to($recipientEmail)->send(
                    new PaymentReceiptMail($order, $receipt, $payment, $pdfBytes)
                );

                $receipt->update([
                    'email_status' => 'sent',
                    'sent_at' => now(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error("Failed to send payment receipt email for order #{$order->order_number}: {$e->getMessage()}");
            $receipt->update([
                'email_status' => 'failed',
            ]);
        }

        return $receipt;
    }

    /**
     * Send the initial order report before a pending Bakong payment is
     * verified. The final payment receipt is sent separately after success.
     */
    public function sendOrderConfirmation(Order $order, ?Payment $payment = null): Receipt
    {
        $this->applyDynamicMailSettings();
        $order->loadMissing('items', 'customer');
        $receipt = $this->getOrCreateReceipt($order, $payment);

        try {
            $recipientEmail = $order->shipping_email ?: $order->customer_email;
            if (! empty($recipientEmail)) {
                Mail::to($recipientEmail)->send(
                    new OrderConfirmationMail($order, $receipt, $payment)
                );

                $receipt->update([
                    'email_status' => 'sent',
                    'sent_at' => now(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error("Failed to send order confirmation email for order #{$order->order_number}: {$e->getMessage()}");
            $receipt->update([
                'email_status' => 'failed',
            ]);
        }

        return $receipt;
    }
}
