<?php

namespace App\Http\Controllers\Api\V1\Telegram;

use App\Http\Controllers\Controller;
use App\Models\TelegramAccount;
use App\Models\TelegramChatSession;
use App\Services\Telegram\TelegramAiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TelegramAiController extends Controller
{
    public function __construct(protected TelegramAiService $aiService) {}

    /**
     * Send message to Telegram AI Shopping Assistant.
     */
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1000',
            'session_id' => 'nullable|integer',
            'language' => 'nullable|string|in:en,km',
        ]);

        $user = Auth::user();
        $account = null;

        if ($user && $user->telegramAccount) {
            $account = $user->telegramAccount;
        } else {
            // Find or create default webapp guest account
            $account = TelegramAccount::firstOrCreate(
                ['telegram_user_id' => 100000000],
                [
                    'user_id' => $user?->id,
                    'telegram_username' => 'guest_shopper',
                    'first_name' => $user?->name ?? 'Guest',
                    'last_name' => 'Shopper',
                    'language_code' => $validated['language'] ?? 'en',
                    'is_bot_admin' => false,
                ]
            );
        }

        $language = $validated['language'] ?? $account->language_code ?? 'en';
        $sessionId = $validated['session_id'] ?? null;

        $response = $this->aiService->chat($account, $validated['message'], $sessionId, $language);

        return response()->json([
            'status' => 'success',
            'data' => $response,
        ]);
    }

    /**
     * Retrieve conversation history for a given session.
     */
    public function history(string|int $sessionId): JsonResponse
    {
        if (! is_numeric($sessionId)) {
            return response()->json(['status' => 'error', 'message' => 'Chat session not found.'], 404);
        }

        $session = TelegramChatSession::with('messages')->find((int) $sessionId);
        if (! $session) {
            return response()->json(['status' => 'error', 'message' => 'Chat session not found.'], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'session_id' => $session->id,
                'session_type' => $session->session_type,
                'messages' => $session->messages,
            ],
        ]);
    }
}
