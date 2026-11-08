<?php

namespace App\Http\Controllers\Api\V1\Telegram;

use App\Http\Controllers\Controller;
use App\Services\Telegram\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    public function __construct(protected TelegramService $telegramService)
    {
    }

    /**
     * Handle incoming webhook updates from Telegram Bot API.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $secretHeader = $request->header('X-Telegram-Bot-Api-Secret-Token');

        if (!$this->telegramService->verifyWebhookSecret($secretHeader)) {
            Log::warning('Telegram webhook rejected: invalid secret token header', [
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized webhook signature.',
            ], 403);
        }

        $payload = $request->all();
        if (empty($payload)) {
            return response()->json(['status' => 'empty_payload'], 400);
        }

        try {
            $result = $this->telegramService->handleUpdate($payload);

            return response()->json([
                'status' => 'ok',
                'result' => $result,
            ]);
        } catch (\Throwable $e) {
            Log::error('Telegram webhook processing error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Always respond 200 to Telegram so it doesn't repeatedly retry on application error
            return response()->json([
                'status' => 'handled_with_error',
                'message' => $e->getMessage(),
            ], 200);
        }
    }
}

