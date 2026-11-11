<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Receipt\PaymentReceiptPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ReceiptController extends Controller
{
    protected PaymentReceiptPdfService $pdfService;

    public function __construct(PaymentReceiptPdfService $pdfService)
    {
        $this->pdfService = $pdfService;
    }

    /**
     * Download or view receipt PDF for an order.
     *
     * @return Response|JsonResponse
     */
    public function show(Request $request, string $orderIdentifier)
    {
        $order = is_numeric($orderIdentifier)
            ? Order::with('items', 'customer', 'payments')->find($orderIdentifier)
            : Order::with('items', 'customer', 'payments')->where('order_number', $orderIdentifier)->first();

        if (! $order) {
            return response()->json(['status' => 'error', 'message' => 'Order not found.'], 404);
        }

        $user = $request->user('sanctum') ?? $request->user();
        $isStaff = $user && method_exists($user, 'hasAnyRole')
            && $user->hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'DELIVERY']);
        if (! $user || (! $isStaff && (int) $order->user_id !== (int) $user->id)) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $receipt = $this->pdfService->getOrCreateReceipt($order);
        $format = $request->query('format', 'pdf');

        if ($format === 'html') {
            $html = $this->pdfService->renderHtml($order, $receipt);

            return response($html, 200, ['Content-Type' => 'text/html']);
        }

        if ($format === 'json') {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'receipt_number' => $receipt->receipt_number,
                    'order_number' => $order->order_number,
                    'issued_at' => $receipt->issued_at,
                    'email_status' => $receipt->email_status,
                    'total_amount' => $order->total_amount,
                    'currency' => $order->currency,
                ],
            ]);
        }

        $pdfBytes = $this->pdfService->generatePdfBytes($order, $receipt);

        return response($pdfBytes, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"receipt-{$receipt->receipt_number}.pdf\"",
        ]);
    }

    /**
     * Resend payment receipt email to customer.
     */
    public function resend(Request $request, string $orderIdentifier): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN') || $user->hasRole('STAFF'))) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $order = is_numeric($orderIdentifier)
            ? Order::with('items', 'customer', 'payments')->find($orderIdentifier)
            : Order::with('items', 'customer', 'payments')->where('order_number', $orderIdentifier)->first();

        if (! $order) {
            return response()->json(['status' => 'error', 'message' => 'Order not found.'], 404);
        }

        $receipt = $this->pdfService->generateAndSend($order);

        return response()->json([
            'status' => 'success',
            'message' => "Receipt #{$receipt->receipt_number} generated and queued for email delivery to {$order->shipping_email}.",
            'data' => [
                'receipt_number' => $receipt->receipt_number,
                'email_status' => $receipt->email_status,
                'recipient' => $order->shipping_email,
            ],
        ]);
    }
}
