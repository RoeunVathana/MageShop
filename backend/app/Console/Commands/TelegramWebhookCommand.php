<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

class TelegramWebhookCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'telegram:webhook {action=info : info, set, or delete} {url? : Webhook URL when setting}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Manage Telegram Bot Webhook registration (info, set, delete)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $botToken = (string) Config::get('telegram.bot_token', '');
        $apiBaseUrl = rtrim((string) Config::get('telegram.api_base_url', 'https://api.telegram.org'), '/');
        $secretToken = (string) Config::get('telegram.webhook_secret', '');

        if (empty($botToken) || str_starts_with($botToken, 'test_') || str_starts_with($botToken, '8102938475')) {
            $this->warn('Mock/development token is configured.');
            $this->info("Current configured secret: {$secretToken}");
            return Command::SUCCESS;
        }

        $action = strtolower($this->argument('action'));

        switch ($action) {
            case 'set':
                $url = $this->argument('url') ?: (Config::get('app.url') . '/api/v1/telegram/webhook');
                $this->info("Setting webhook to: {$url}");

                $response = Http::post("{$apiBaseUrl}/bot{$botToken}/setWebhook", [
                    'url' => $url,
                    'secret_token' => $secretToken,
                    'allowed_updates' => ['message', 'callback_query'],
                ]);

                $this->line($response->body());
                return $response->successful() ? Command::SUCCESS : Command::FAILURE;

            case 'delete':
                $this->info("Deleting webhook...");
                $response = Http::post("{$apiBaseUrl}/bot{$botToken}/deleteWebhook");
                $this->line($response->body());
                return $response->successful() ? Command::SUCCESS : Command::FAILURE;

            case 'info':
            default:
                $this->info("Checking Telegram webhook info...");
                $response = Http::get("{$apiBaseUrl}/bot{$botToken}/getWebhookInfo");
                $this->line($response->body());
                return $response->successful() ? Command::SUCCESS : Command::FAILURE;
        }
    }
}

