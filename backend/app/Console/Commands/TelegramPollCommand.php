<?php

namespace App\Console\Commands;

use App\Services\Telegram\TelegramService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

class TelegramPollCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'telegram:poll {--once : Run once and exit} {--timeout=30 : Long polling timeout in seconds}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Poll Telegram Bot updates via long-polling (useful for local development without webhook)';

    /**
     * Execute the console command.
     */
    public function handle(TelegramService $telegramService): int
    {
        $botToken = (string) Config::get('telegram.bot_token', '');
        $apiBaseUrl = rtrim((string) Config::get('telegram.api_base_url', 'https://api.telegram.org'), '/');

        if (empty($botToken) || str_starts_with($botToken, 'test_') || str_starts_with($botToken, '8102938475')) {
            $this->warn('TELEGRAM_BOT_TOKEN is set to a placeholder/mock token.');
            $this->info('In development mode, you can test commands via webhook POST /api/v1/telegram/webhook or simulated chat.');
            if ($this->option('once')) {
                return Command::SUCCESS;
            }
            $this->info('Simulating active poll listener loop...');
            sleep(1);

            return Command::SUCCESS;
        }

        $this->info('Starting Telegram Bot long-polling daemon for bot: '.Config::get('telegram.bot_username'));
        $this->info("Press Ctrl+C to terminate.\n");

        $offset = 0;
        $timeout = (int) $this->option('timeout');
        $runOnce = (bool) $this->option('once');

        // Delete any existing webhook before polling, as Telegram does not allow getUpdates when webhook is set
        try {
            Http::timeout(10)->post("{$apiBaseUrl}/bot{$botToken}/deleteWebhook");
        } catch (\Throwable $e) {
            $this->warn("Note: Could not delete webhook: {$e->getMessage()}");
        }

        do {
            try {
                $response = Http::timeout($timeout + 5)->get("{$apiBaseUrl}/bot{$botToken}/getUpdates", [
                    'offset' => $offset,
                    'timeout' => $timeout,
                ]);

                if ($response->successful()) {
                    $result = $response->json('result', []);
                    foreach ($result as $update) {
                        $updateId = $update['update_id'] ?? null;
                        if ($updateId) {
                            $offset = $updateId + 1;
                        }

                        $res = $telegramService->handleUpdate($update);
                        $this->line("Processed update #{$updateId}: ".json_encode($res));
                    }
                } else {
                    $this->error('Telegram API error: '.$response->body());
                    sleep(3);
                }
            } catch (\Throwable $e) {
                $this->error('Poll error: '.$e->getMessage());
                sleep(3);
            }
        } while (! $runOnce);

        return Command::SUCCESS;
    }
}
