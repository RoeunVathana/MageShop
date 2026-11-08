<?php

namespace App\Services\Receipt;

use App\Mail\PaymentReceiptMail;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\StoreSetting;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\View;

class PaymentReceiptPdfService
{
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
        $receipt = $this->getOrCreateReceipt($order, $payment);
        $payment = $payment ?? $order->payments()->latest()->first();

        try {
            $pdfBytes = $this->generatePdfBytes($order, $receipt, $payment);

            // Store PDF to receipts directory
            $fileName = "receipts/receipt-{$receipt->receipt_number}.pdf";
            // Default disk is S3 in production (FILESYSTEM_DISK=s3), so receipts survive redeploys.
            Storage::disk(config('filesystems.default', 'local'))->put($fileName, $pdfBytes);

            $receipt->update([
                'receipt_file_path' => $fileName,
            ]);

            // Dispatch Email if shipping email is present
            if (! empty($order->shipping_email)) {
                Mail::to($order->shipping_email)->send(
                    new PaymentReceiptMail($order, $receipt, $payment, $pdfBytes)
                );

                $receipt->update([
                    'email_status' => 'sent',
                    'sent_at' => now(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error("Failed to generate or send receipt for order #{$order->order_number}: {$e->getMessage()}");
            $receipt->update([
                'email_status' => 'failed',
            ]);
        }

        return $receipt;
    }
}
