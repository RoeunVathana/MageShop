<?php

namespace App\Services\Telegram;

use App\Models\Category;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Receipt;
use App\Models\StoreSetting;
use App\Models\TelegramAccount;
use App\Models\TelegramAdminAction;
use App\Models\TelegramBotUpdate;
use App\Models\TelegramNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    protected string $botToken;

    protected string $webhookSecret;

    protected string $miniAppUrl;

    protected string $apiBaseUrl;

    protected ?int $adminChatId;

    public function __construct()
    {
        $dbBotToken = null;
        $dbWebhookSecret = null;
        $dbMiniAppUrl = null;
        $dbAdminChatId = null;

        try {
            $dbBotToken = StoreSetting::get('telegram_bot_token');
            $dbWebhookSecret = StoreSetting::get('telegram_webhook_secret');
            $dbMiniAppUrl = StoreSetting::get('telegram_mini_app_url');
            $dbAdminChatId = StoreSetting::get('telegram_admin_chat_id');
        } catch (\Throwable $e) {
            // Fallback to config if store_settings table is not yet initialized
        }

        $this->botToken = ! empty($dbBotToken) ? (string) $dbBotToken : (string) Config::get('telegram.bot_token', '');
        $this->webhookSecret = ! empty($dbWebhookSecret) ? (string) $dbWebhookSecret : (string) Config::get('telegram.webhook_secret', '');
        $this->miniAppUrl = ! empty($dbMiniAppUrl) ? (string) $dbMiniAppUrl : (string) Config::get('telegram.mini_app_url', 'https://tyushop.blog/telegram-app');
        $this->apiBaseUrl = rtrim((string) Config::get('telegram.api_base_url', 'https://api.telegram.org'), '/');
        $resolvedChatId = ! empty($dbAdminChatId) ? $dbAdminChatId : (Config::get('telegram.admin_chat_id') ?: env('TELEGRAM_CHAT_ID', '5934277627'));
        $this->adminChatId = $resolvedChatId ? (int) $resolvedChatId : 5934277627;
    }

    /**
     * Verify incoming webhook secret token header.
     */
    public function verifyWebhookSecret(?string $receivedSecret): bool
    {
        if (empty($this->webhookSecret)) {
            return true;
        }

        return hash_equals($this->webhookSecret, (string) $receivedSecret);
    }

    /**
     * Deduplicate update: returns true if already processed, false if new.
     */
    public function isUpdateProcessed(int $updateId): bool
    {
        $existing = TelegramBotUpdate::where('update_id', $updateId)->first();
        if ($existing) {
            return true;
        }

        TelegramBotUpdate::create([
            'update_id' => $updateId,
            'processed_at' => now(),
            'status' => 'processed',
        ]);

        return false;
    }

    /**
     * Process incoming Telegram webhook update.
     */
    public function handleUpdate(array $update): array
    {
        $updateId = $update['update_id'] ?? null;
        if ($updateId && $this->isUpdateProcessed((int) $updateId)) {
            return ['status' => 'ignored_duplicate', 'update_id' => $updateId];
        }

        if (isset($update['message'])) {
            return $this->handleMessage($update['message']);
        }

        if (isset($update['callback_query'])) {
            return $this->handleCallbackQuery($update['callback_query']);
        }

        return ['status' => 'unhandled_update_type'];
    }

    /**
     * Route and handle incoming text messages / commands.
     */
    protected function handleMessage(array $message): array
    {
        $chatId = $message['chat']['id'] ?? null;
        $text = trim($message['text'] ?? '');
        $from = $message['from'] ?? [];
        $userId = $from['id'] ?? null;

        if (! $chatId || ! $userId) {
            return ['status' => 'missing_chat_or_user'];
        }

        // Upsert / sync TelegramAccount
        $account = $this->syncTelegramAccount($from);

        if (str_starts_with($text, '/')) {
            $parts = explode(' ', $text, 2);
            $command = strtolower(explode('@', $parts[0])[0]); // strip bot username if present: /start@TYUSHOPAiBot
            $param = isset($parts[1]) ? trim($parts[1]) : '';

            return $this->executeCommand($command, $param, $chatId, $account, $from);
        }

        // Natural conversation handled by AI or friendly greeting
        $storeName = StoreSetting::get('store_name', 'TYUSHOP');
        $reply = "Hello {$from['first_name']}! 👋 Welcome to {$storeName}.\n\n"
               .'You can open our shop Mini App below, or ask me any question about our products, stock, or policies!';

        $this->sendMessage($chatId, $reply, [
            'reply_markup' => [
                'inline_keyboard' => [
                    [
                        ['text' => '🛍️ Open Shopping Mini App', 'web_app' => ['url' => $this->miniAppUrl]],
                    ],
                    [
                        ['text' => '📦 Featured Products', 'callback_data' => 'cmd:products'],
                        ['text' => '❓ Help & Guide', 'callback_data' => 'cmd:help'],
                    ],
                ],
            ],
        ]);

        return ['status' => 'message_replied', 'command' => null];
    }

    /**
     * Execute bot commands.
     */
    public function executeCommand(string $command, string $param, int $chatId, TelegramAccount $account, array $from): array
    {
        $storeName = StoreSetting::get('store_name', 'TYUSHOP');
        $currency = StoreSetting::get('default_currency', 'USD');
        $isAdmin = $this->isAccountAdmin($account);

        switch ($command) {
            case '/start':
                $welcome = "🌟 *Welcome to {$storeName}!* 🌟\n\n"
                    ."Hi {$account->first_name}, discover Cambodia's top electronics and lifestyle products with instant Bakong KHQR checkout.\n\n"
                    ."⚡ *Quick Actions:*\n"
                    ."• Tap the button below to launch the *Shopping Mini App*\n"
                    ."• Type `/products` to see our catalog\n"
                    ."• Type `/categories` to browse departments\n"
                    ."• Type `/orders` to view your purchases\n"
                    ."• Type `/track <order_id>` to check parcel status\n"
                    .'• Ask our AI Assistant any product question anytime!';

                $keyboard = [
                    'inline_keyboard' => [
                        [
                            ['text' => '🛍️ Open TYUSHOP Mini App', 'web_app' => ['url' => $this->miniAppUrl]],
                        ],
                        [
                            ['text' => '🔥 Featured Items', 'callback_data' => 'cmd:products'],
                            ['text' => '📂 Categories', 'callback_data' => 'cmd:categories'],
                        ],
                        [
                            ['text' => '📦 My Orders', 'callback_data' => 'cmd:orders'],
                            ['text' => '💬 Store Policies', 'callback_data' => 'cmd:policies'],
                        ],
                    ],
                ];

                if ($isAdmin) {
                    $keyboard['inline_keyboard'][] = [
                        ['text' => '🔐 Staff Admin Console', 'callback_data' => 'cmd:admin'],
                    ];
                }

                $this->sendMessage($chatId, $welcome, [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => $keyboard,
                ]);

                return ['status' => 'command_executed', 'command' => '/start'];

            case '/shop':
                $this->sendMessage($chatId, '🛍️ Tap below to browse products and check out inside Telegram:', [
                    'reply_markup' => [
                        'inline_keyboard' => [
                            [['text' => '🚀 Launch TYUSHOP Mini App', 'web_app' => ['url' => $this->miniAppUrl]]],
                        ],
                    ],
                ]);

                return ['status' => 'command_executed', 'command' => '/shop'];

            case '/products':
                $products = Product::where('status', 'active')
                    ->where('is_published', true)
                    ->orderByDesc('is_featured')
                    ->limit(5)
                    ->get();

                if ($products->isEmpty()) {
                    $this->sendMessage($chatId, 'No active products available right now. Please check back shortly.');

                    return ['status' => 'command_executed', 'command' => '/products'];
                }

                $msg = "🔥 *Featured Products at {$storeName}:*\n\n";
                foreach ($products as $p) {
                    $stockText = $p->stock_quantity > 0 ? "In Stock ({$p->stock_quantity})" : '⚠️ Out of Stock';
                    $msg .= "• *{$p->name}*\n"
                         ."  Price: `\${$p->price}` | {$stockText}\n"
                         ."  SKU: `{$p->sku}`\n\n";
                }

                $this->sendMessage($chatId, $msg, [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => [
                        'inline_keyboard' => [
                            [['text' => '🛒 Shop in Mini App', 'web_app' => ['url' => $this->miniAppUrl]]],
                        ],
                    ],
                ]);

                return ['status' => 'command_executed', 'command' => '/products'];

            case '/categories':
                $categories = Category::where('is_active', true)->withCount(['products' => function ($q) {
                    $q->where('status', 'active')->where('is_published', true);
                }])->get();

                $msg = "📂 *Store Categories:*\n\n";
                foreach ($categories as $cat) {
                    $msg .= "• *{$cat->name}* ({$cat->products_count} items)\n";
                }

                $this->sendMessage($chatId, $msg, [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => [
                        'inline_keyboard' => [
                            [['text' => '🛍️ Explore in Mini App', 'web_app' => ['url' => "{$this->miniAppUrl}?view=categories"]]],
                        ],
                    ],
                ]);

                return ['status' => 'command_executed', 'command' => '/categories'];

            case '/orders':
                if (! $account->user_id) {
                    $this->sendMessage($chatId, '⚠️ No linked customer account found. Please open the Mini App to link your profile automatically.');

                    return ['status' => 'command_executed', 'command' => '/orders'];
                }

                $orders = Order::where('customer_id', $account->user_id)
                    ->orderByDesc('created_at')
                    ->limit(5)
                    ->get();

                if ($orders->isEmpty()) {
                    $this->sendMessage($chatId, "📦 You haven't placed any orders yet. Open our Mini App to discover great deals!", [
                        'reply_markup' => [
                            'inline_keyboard' => [
                                [['text' => '🛍️ Start Shopping', 'web_app' => ['url' => $this->miniAppUrl]]],
                            ],
                        ],
                    ]);

                    return ['status' => 'command_executed', 'command' => '/orders'];
                }

                $msg = "📦 *Your Recent Orders:*\n\n";
                foreach ($orders as $ord) {
                    $status = strtoupper($ord->status);
                    $payment = strtoupper($ord->payment_status);
                    $msg .= "• Order *#{$ord->order_number}*\n"
                         ."  Total: `\${$ord->total_amount}`\n"
                         ."  Status: *{$status}* | Payment: *{$payment}*\n"
                         ."  Tracking: `/track {$ord->order_number}`\n\n";
                }

                $this->sendMessage($chatId, $msg, [
                    'parse_mode' => 'Markdown',
                ]);

                return ['status' => 'command_executed', 'command' => '/orders'];

            case '/track':
                if (empty($param)) {
                    $this->sendMessage($chatId, 'ℹ️ Please specify an order number. Example: `/track ORD-2026-9041`', [
                        'parse_mode' => 'Markdown',
                    ]);

                    return ['status' => 'command_executed', 'command' => '/track'];
                }

                $order = Order::where('order_number', $param)->first();
                if (! $order) {
                    $this->sendMessage($chatId, "❌ Order `{$param}` was not found in our system. Please check the order number.", [
                        'parse_mode' => 'Markdown',
                    ]);

                    return ['status' => 'command_executed', 'command' => '/track'];
                }

                $msg = "📍 *Order Tracking: #{$order->order_number}*\n\n"
                     ."• Customer: {$order->shipping_full_name}\n"
                     ."• Total: `\${$order->total_amount}`\n"
                     .'• Fulfillment Status: *'.strtoupper($order->status)."*\n"
                     .'• Payment Status: *'.strtoupper($order->payment_status)."*\n"
                     ."• Delivery Method: {$order->shipping_method}\n"
                     ."• Shipping Address: {$order->shipping_address_line1}, {$order->shipping_city}\n";

                if ($order->tracking_number) {
                    $msg .= "• Tracking Code: `{$order->tracking_number}`\n";
                }

                $this->sendMessage($chatId, $msg, [
                    'parse_mode' => 'Markdown',
                ]);

                return ['status' => 'command_executed', 'command' => '/track'];

            case '/help':
                $supportEmail = StoreSetting::get('support_email', 'Vothanarern@gmail.com');
                $phone = StoreSetting::get('contact_phone', '016 555 637');

                $help = "ℹ️ *TYUSHOP Shopping Assistant Help*\n\n"
                      ."*Customer Commands:*\n"
                      ."• `/start` — Restart bot and show navigation menu\n"
                      ."• `/shop` — Launch Telegram Mini App storefront\n"
                      ."• `/products` — View top featured products\n"
                      ."• `/categories` — View all departments\n"
                      ."• `/orders` — View your purchase history\n"
                      ."• `/track <order_id>` — Track order shipping status\n"
                      ."• `/help` — Display this help message\n\n"
                      ."💬 *Need human support?*\n"
                      ."Email: `{$supportEmail}`\n"
                      ."Phone: `{$phone}`\n"
                      .'Working hours: 8:00 AM – 9:00 PM (GMT+7)';

                $this->sendMessage($chatId, $help, [
                    'parse_mode' => 'Markdown',
                ]);

                return ['status' => 'command_executed', 'command' => '/help'];

                // ================= ADMIN COMMANDS =================
            case '/admin':
            case '/adminhelp':
            case '/stock':
            case '/lowstock':
            case '/sales':
            case '/pending':
            case '/deliveries':
            case '/report':
                if (! $isAdmin) {
                    $this->sendMessage($chatId, "⛔ Access Denied. You do not have staff administrator privileges for {$storeName}.");

                    return ['status' => 'forbidden', 'command' => $command];
                }

                return $this->executeAdminCommand($command, $param, $chatId, $account);

            default:
                $this->sendMessage($chatId, "❓ Unknown command `{$command}`. Type `/help` for available options.", [
                    'parse_mode' => 'Markdown',
                ]);

                return ['status' => 'unknown_command', 'command' => $command];
        }
    }

    /**
     * Execute Admin Bot Commands.
     */
    protected function executeAdminCommand(string $command, string $param, int $chatId, TelegramAccount $account): array
    {
        switch ($command) {
            case '/admin':
                $ordersToday = Order::whereDate('created_at', Carbon::today())->count();
                $salesToday = Order::whereDate('created_at', Carbon::today())
                    ->where('payment_status', 'paid')
                    ->sum('total_amount');
                $pendingOrders = Order::where('status', 'pending')->count();
                $lowStockCount = Product::whereColumn('stock_quantity', '<=', 'low_stock_threshold')->count();

                $msg = "🔐 *TYUSHOP Admin Console*\n\n"
                     ."📊 *Today's Operations:*\n"
                     ."• Orders Today: *{$ordersToday}*\n"
                     .'• Revenue Today: `$'.number_format($salesToday, 2)."`\n"
                     ."• Pending Fulfillment: *{$pendingOrders}*\n"
                     ."• Low Stock Alerts: *{$lowStockCount}*\n\n"
                     ."🛠️ *Admin Quick Commands:*\n"
                     ."• `/lowstock` — View low stock items\n"
                     ."• `/stock <sku>` — Check product inventory\n"
                     ."• `/sales` — Revenue breakdown\n"
                     ."• `/pending` — Pending orders queue\n"
                     ."• `/deliveries` — In-transit packages\n"
                     .'• `/report` — Complete operational report';

                $this->sendMessage($chatId, $msg, [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => [
                        'inline_keyboard' => [
                            [
                                ['text' => '⚠️ Low Stock', 'callback_data' => 'adm:lowstock'],
                                ['text' => '⏳ Pending Orders', 'callback_data' => 'adm:pending'],
                            ],
                            [
                                ['text' => '💰 Sales Summary', 'callback_data' => 'adm:sales'],
                                ['text' => '📊 Full Report', 'callback_data' => 'adm:report'],
                            ],
                        ],
                    ],
                ]);

                return ['status' => 'admin_command_executed', 'command' => '/admin'];

            case '/adminhelp':
                $msg = "🛠️ *Admin Command Reference:*\n\n"
                     ."• `/admin` — High-level store dashboard\n"
                     ."• `/stock <sku>` — Lookup stock & trigger adjustment\n"
                     ."• `/lowstock` — Products at or below reorder threshold\n"
                     ."• `/sales` — Daily, weekly, and monthly sales\n"
                     ."• `/pending` — Orders awaiting processing\n"
                     ."• `/deliveries` — Dispatched/out-for-delivery orders\n"
                     .'• `/report` — Stock and order summary report';

                $this->sendMessage($chatId, $msg, ['parse_mode' => 'Markdown']);

                return ['status' => 'admin_command_executed', 'command' => '/adminhelp'];

            case '/stock':
                if (empty($param)) {
                    $this->sendMessage($chatId, 'ℹ️ Please provide a SKU. Example: `/stock LAP-MBP-016`', ['parse_mode' => 'Markdown']);

                    return ['status' => 'admin_command_executed', 'command' => '/stock'];
                }

                $product = Product::where('sku', strtoupper($param))->first();
                if (! $product) {
                    $this->sendMessage($chatId, "❌ Product with SKU `{$param}` not found.", ['parse_mode' => 'Markdown']);

                    return ['status' => 'admin_command_executed', 'command' => '/stock'];
                }

                $msg = "📦 *Product Inventory Details:*\n\n"
                     ."• Name: *{$product->name}*\n"
                     ."• SKU: `{$product->sku}`\n"
                     ."• Stock Quantity: *{$product->stock_quantity}*\n"
                     ."• Low Stock Alert At: {$product->low_stock_threshold}\n"
                     ."• Price: `\${$product->price}`\n"
                     .'• Status: '.($product->stock_quantity <= $product->low_stock_threshold ? '⚠️ *LOW STOCK*' : '✅ *Healthy*');

                // Offer quick stock adjustment actions
                $this->sendMessage($chatId, $msg, [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => [
                        'inline_keyboard' => [
                            [
                                ['text' => '➕ Add 5 Units', 'callback_data' => "adm_adj:{$product->id}:add:5"],
                                ['text' => '➕ Add 10 Units', 'callback_data' => "adm_adj:{$product->id}:add:10"],
                            ],
                            [
                                ['text' => '➖ Deduct 1 Unit', 'callback_data' => "adm_adj:{$product->id}:sub:1"],
                            ],
                        ],
                    ],
                ]);

                return ['status' => 'admin_command_executed', 'command' => '/stock'];

            case '/lowstock':
                $lowStockProducts = Product::whereColumn('stock_quantity', '<=', 'low_stock_threshold')
                    ->orderBy('stock_quantity')
                    ->limit(10)
                    ->get();

                if ($lowStockProducts->isEmpty()) {
                    $this->sendMessage($chatId, '✅ All products have healthy stock levels above their thresholds.');

                    return ['status' => 'admin_command_executed', 'command' => '/lowstock'];
                }

                $msg = "⚠️ *Low Stock Alert ({$lowStockProducts->count()} items):*\n\n";
                foreach ($lowStockProducts as $p) {
                    $msg .= "• *{$p->name}*\n"
                         ."  SKU: `{$p->sku}` | Stock: *{$p->stock_quantity}* (threshold: {$p->low_stock_threshold})\n"
                         ."  Action: `/stock {$p->sku}`\n\n";
                }

                $this->sendMessage($chatId, $msg, ['parse_mode' => 'Markdown']);

                return ['status' => 'admin_command_executed', 'command' => '/lowstock'];

            case '/sales':
                $todaySales = Order::whereDate('created_at', Carbon::today())->where('payment_status', 'paid')->sum('total_amount');
                $weekSales = Order::where('created_at', '>=', Carbon::now()->startOfWeek())->where('payment_status', 'paid')->sum('total_amount');
                $monthSales = Order::where('created_at', '>=', Carbon::now()->startOfMonth())->where('payment_status', 'paid')->sum('total_amount');
                $totalPaidOrders = Order::where('payment_status', 'paid')->count();

                $msg = "💰 *TYUSHOP Sales Performance:*\n\n"
                     .'• Today: `$'.number_format($todaySales, 2)."`\n"
                     .'• This Week: `$'.number_format($weekSales, 2)."`\n"
                     .'• This Month: `$'.number_format($monthSales, 2)."`\n"
                     ."• All-Time Paid Orders: *{$totalPaidOrders}*\n";

                $this->sendMessage($chatId, $msg, ['parse_mode' => 'Markdown']);

                return ['status' => 'admin_command_executed', 'command' => '/sales'];

            case '/pending':
                $pending = Order::where('status', 'pending')
                    ->orderBy('created_at')
                    ->limit(10)
                    ->get();

                if ($pending->isEmpty()) {
                    $this->sendMessage($chatId, '🎉 No pending orders awaiting fulfillment at this moment!');

                    return ['status' => 'admin_command_executed', 'command' => '/pending'];
                }

                $msg = "⏳ *Pending Orders Queue ({$pending->count()}):*\n\n";
                foreach ($pending as $ord) {
                    $msg .= "• Order *#{$ord->order_number}* | `\${$ord->total_amount}`\n"
                         ."  Customer: {$ord->shipping_full_name}\n"
                         .'  Payment: *'.strtoupper($ord->payment_status)."*\n"
                         ."  Details: `/track {$ord->order_number}`\n\n";
                }

                $this->sendMessage($chatId, $msg, ['parse_mode' => 'Markdown']);

                return ['status' => 'admin_command_executed', 'command' => '/pending'];

            case '/deliveries':
                $delivering = Order::whereIn('status', ['shipped', 'out_for_delivery'])
                    ->orderBy('created_at', 'desc')
                    ->limit(10)
                    ->get();

                if ($delivering->isEmpty()) {
                    $this->sendMessage($chatId, '🚚 No packages currently marked as in-transit.');

                    return ['status' => 'admin_command_executed', 'command' => '/deliveries'];
                }

                $msg = "🚚 *In-Transit Deliveries ({$delivering->count()}):*\n\n";
                foreach ($delivering as $ord) {
                    $msg .= "• *#{$ord->order_number}* to {$ord->shipping_city}\n"
                         .'  Status: *'.strtoupper($ord->status)."*\n"
                         .'  Tracking: `'.($ord->tracking_number ?? 'Pending Carrier')."`\n\n";
                }

                $this->sendMessage($chatId, $msg, ['parse_mode' => 'Markdown']);

                return ['status' => 'admin_command_executed', 'command' => '/deliveries'];

            case '/report':
                $totalProducts = Product::count();
                $totalStock = Product::sum('stock_quantity');
                $lowStock = Product::whereColumn('stock_quantity', '<=', 'low_stock_threshold')->count();
                $totalOrders = Order::count();
                $paidOrders = Order::where('payment_status', 'paid')->count();
                $lifetimeRev = Order::where('payment_status', 'paid')->sum('total_amount');

                $msg = "📊 *TYUSHOP Operational Snapshot*\n\n"
                     ."🏷️ *Catalog & Inventory:*\n"
                     ."• Active Catalog Items: *{$totalProducts}*\n"
                     ."• Total Warehouse Units: *{$totalStock}*\n"
                     ."• Low Stock Items: *{$lowStock}*\n\n"
                     ."💼 *Fulfillment & Sales:*\n"
                     ."• Total Orders Recorded: *{$totalOrders}*\n"
                     ."• Paid Transactions: *{$paidOrders}*\n"
                     .'• Lifetime Settled Revenue: `$'.number_format($lifetimeRev, 2)."`\n\n"
                     .'Generated at: '.now()->format('Y-m-d H:i:s').' UTC';

                $this->sendMessage($chatId, $msg, ['parse_mode' => 'Markdown']);

                return ['status' => 'admin_command_executed', 'command' => '/report'];
        }

        return ['status' => 'unhandled_admin_command'];
    }

    /**
     * Handle callback queries from inline buttons.
     */
    protected function handleCallbackQuery(array $callbackQuery): array
    {
        $id = $callbackQuery['id'] ?? null;
        $data = $callbackQuery['data'] ?? '';
        $message = $callbackQuery['message'] ?? [];
        $chatId = $message['chat']['id'] ?? null;
        $from = $callbackQuery['from'] ?? [];

        if (! $chatId || ! $id) {
            return ['status' => 'missing_callback_details'];
        }

        $account = $this->syncTelegramAccount($from);
        $isAdmin = $this->isAccountAdmin($account);

        // Acknowledge callback immediately
        $this->answerCallbackQuery($id);

        if (str_starts_with($data, 'cmd:')) {
            $cmd = '/'.substr($data, 4);

            return $this->executeCommand($cmd, '', $chatId, $account, $from);
        }

        if (str_starts_with($data, 'adm:')) {
            if (! $isAdmin) {
                $this->sendMessage($chatId, '⛔ Admin authorization required.');

                return ['status' => 'forbidden'];
            }
            $cmd = '/'.substr($data, 4);

            return $this->executeAdminCommand($cmd, '', $chatId, $account);
        }

        // Stock adjustments: adm_adj:{product_id}:{add|sub}:{qty}
        if (str_starts_with($data, 'adm_adj:')) {
            if (! $isAdmin) {
                $this->sendMessage($chatId, '⛔ Admin authorization required.');

                return ['status' => 'forbidden'];
            }

            $parts = explode(':', $data);
            $productId = (int) ($parts[1] ?? 0);
            $type = $parts[2] ?? 'add';
            $qty = (int) ($parts[3] ?? 1);

            $product = Product::find($productId);
            if (! $product) {
                $this->sendMessage($chatId, '❌ Product not found.');

                return ['status' => 'not_found'];
            }

            // Create pending TelegramAdminAction for audit trail & confirmation
            $delta = ($type === 'add') ? $qty : -$qty;
            $action = TelegramAdminAction::create([
                'staff_id' => $account->user_id,
                'action' => 'stock_adjust',
                'target_type' => 'Product',
                'target_id' => (string) $product->id,
                'payload' => [
                    'sku' => $product->sku,
                    'delta' => $delta,
                    'previous_stock' => $product->stock_quantity,
                    'reason' => 'Adjusted via Telegram Admin Bot',
                ],
                'confirmation_status' => 'pending',
            ]);

            $newProjected = $product->stock_quantity + $delta;
            $sign = $delta > 0 ? "+{$delta}" : "{$delta}";

            $confirmMsg = "⚠️ *Confirm Stock Adjustment:*\n\n"
                        ."Product: *{$product->name}* (`{$product->sku}`)\n"
                        ."Current Stock: *{$product->stock_quantity}*\n"
                        ."Adjustment: *{$sign}*\n"
                        ."Projected New Stock: *{$newProjected}*\n\n"
                        .'Do you confirm this inventory change?';

            $this->sendMessage($chatId, $confirmMsg, [
                'parse_mode' => 'Markdown',
                'reply_markup' => [
                    'inline_keyboard' => [
                        [
                            ['text' => '✅ Confirm & Apply', 'callback_data' => "adm_confirm:{$action->id}"],
                            ['text' => '❌ Cancel', 'callback_data' => "adm_cancel:{$action->id}"],
                        ],
                    ],
                ],
            ]);

            return ['status' => 'adjustment_confirmation_requested', 'action_id' => $action->id];
        }

        // Apply confirmed stock adjustment
        if (str_starts_with($data, 'adm_confirm:')) {
            if (! $isAdmin) {
                $this->sendMessage($chatId, '⛔ Admin authorization required.');

                return ['status' => 'forbidden'];
            }

            $actionId = (int) substr($data, 12);
            $action = TelegramAdminAction::find($actionId);

            if (! $action || $action->confirmation_status !== 'pending') {
                $this->sendMessage($chatId, '⚠️ This action is no longer pending or does not exist.');

                return ['status' => 'action_expired'];
            }

            $product = Product::find((int) $action->target_id);
            if (! $product) {
                $action->update(['confirmation_status' => 'failed']);
                $this->sendMessage($chatId, '❌ Product not found.');

                return ['status' => 'product_missing'];
            }

            $delta = (int) ($action->payload['delta'] ?? 0);
            try {
                $product->adjustStock(
                    $delta,
                    'adjustment',
                    $account->user_id,
                    "Telegram Bot Adjustment by Staff #{$account->user_id}"
                );

                $action->update(['confirmation_status' => 'confirmed']);

                $this->sendMessage($chatId, "✅ *Stock Updated Successfully!*\n\n"
                    ."Product: *{$product->name}* (`{$product->sku}`)\n"
                    ."New Stock Quantity: *{$product->stock_quantity}*", [
                        'parse_mode' => 'Markdown',
                    ]);
            } catch (\Exception $e) {
                $action->update(['confirmation_status' => 'failed']);
                $this->sendMessage($chatId, "❌ Failed to adjust stock: {$e->getMessage()}");
            }

            return ['status' => 'adjustment_processed'];
        }

        if (str_starts_with($data, 'adm_cancel:')) {
            $actionId = (int) substr($data, 11);
            $action = TelegramAdminAction::find($actionId);
            if ($action && $action->confirmation_status === 'pending') {
                $action->update(['confirmation_status' => 'cancelled']);
            }
            $this->sendMessage($chatId, '🚫 Stock adjustment cancelled.');

            return ['status' => 'adjustment_cancelled'];
        }

        return ['status' => 'unhandled_callback_data'];
    }

    /**
     * Sync Telegram user identity into `telegram_accounts`.
     */
    public function syncTelegramAccount(array $from): TelegramAccount
    {
        $telegramId = (int) ($from['id'] ?? 0);
        $username = $from['username'] ?? null;
        $firstName = $from['first_name'] ?? 'Telegram';
        $lastName = $from['last_name'] ?? null;
        $langCode = $from['language_code'] ?? 'en';

        $isConfiguredAdmin = ($this->adminChatId && $this->adminChatId === $telegramId);

        $account = TelegramAccount::where('telegram_user_id', $telegramId)->first();

        if (! $account) {
            $account = TelegramAccount::create([
                'telegram_user_id' => $telegramId,
                'telegram_username' => $username,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'language_code' => $langCode,
                'is_bot_admin' => $isConfiguredAdmin,
            ]);
        } else {
            $account->update([
                'telegram_username' => $username,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'language_code' => $langCode,
                'is_bot_admin' => $account->is_bot_admin || $isConfiguredAdmin,
            ]);
        }

        return $account;
    }

    /**
     * Check if a Telegram account has admin/staff permissions.
     */
    public function isAccountAdmin(TelegramAccount $account): bool
    {
        if ($account->is_bot_admin) {
            return true;
        }

        if ($this->adminChatId && $account->telegram_user_id === $this->adminChatId) {
            return true;
        }

        if ($account->user) {
            return $account->user->hasRole('SUPER_ADMIN')
                || $account->user->hasRole('ADMIN')
                || $account->user->hasRole('STAFF');
        }

        return false;
    }

    /**
     * Send message via Telegram Bot API (or log in dev/test when token is mock).
     *
     * @param  int|string  $chatId
     */
    public function sendMessage($chatId, string $text, array $extra = []): ?array
    {
        if (empty($this->botToken) || str_starts_with($this->botToken, 'test_') || str_starts_with($this->botToken, '8102938475')) {
            Log::info("Mock Telegram Dispatch to [{$chatId}]: {$text}", $extra);

            return [
                'ok' => true,
                'result' => [
                    'message_id' => rand(1000, 99999),
                    'chat' => ['id' => $chatId],
                    'text' => $text,
                ],
            ];
        }

        $url = "{$this->apiBaseUrl}/bot{$this->botToken}/sendMessage";
        $payload = array_merge([
            'chat_id' => $chatId,
            'text' => $text,
        ], $extra);

        try {
            $response = Http::timeout(10)->post($url, $payload);

            return $response->json();
        } catch (\Throwable $e) {
            Log::error("Telegram API sendMessage error: {$e->getMessage()}", ['chat_id' => $chatId]);

            return null;
        }
    }

    /**
     * Answer callback queries.
     */
    public function answerCallbackQuery(string $callbackQueryId, ?string $text = null, bool $showAlert = false): ?array
    {
        if (empty($this->botToken) || str_starts_with($this->botToken, 'test_') || str_starts_with($this->botToken, '8102938475')) {
            return ['ok' => true];
        }

        $url = "{$this->apiBaseUrl}/bot{$this->botToken}/answerCallbackQuery";
        try {
            $response = Http::timeout(5)->post($url, [
                'callback_query_id' => $callbackQueryId,
                'text' => $text,
                'show_alert' => $showAlert,
            ]);

            return $response->json();
        } catch (\Throwable $e) {
            Log::error("Telegram API answerCallbackQuery error: {$e->getMessage()}");

            return null;
        }
    }

    /**
     * Send notification to customer or admin.
     *
     * @param  int|string  $chatId
     */
    public function sendNotification($chatId, string $type, string $message, ?int $userId = null, array $extra = []): void
    {
        $this->sendMessage($chatId, $message, $extra);

        TelegramNotification::create([
            'user_id' => $userId,
            'chat_id' => (int) $chatId,
            'notification_type' => $type,
            'delivery_status' => 'sent',
            'payload' => ['text' => $message, 'extra' => $extra],
            'sent_at' => now(),
        ]);
    }

    /**
     * Dispatch a comprehensive Payment & Order Report to the Telegram Admin Chat.
     */
    public function notifyAdminOrderAndPaymentReport(Order $order, ?Receipt $receipt = null, ?Payment $payment = null): bool
    {
        try {
            $order->loadMissing('items');
            $payment = $payment ?: $order->payments()->latest()->first();
            $receipt = $receipt ?: $order->receipt;

            $totalUsd = number_format((float) $order->total_amount, 2);
            $totalKhr = number_format((float) round((float) $order->total_amount * 4100));
            $methodLabel = strtoupper(str_replace('_', ' ', (string) ($order->payment_method ?: 'BAKONG KHQR')));
            $isPaid = ($order->payment_status === 'paid');
            $statusBadge = $isPaid ? '✅ PAID & VERIFIED' : '💵 CASH ON DELIVERY (COD)';
            $receiptNo = $receipt ? $receipt->receipt_number : ('REC-'.date('Ymd'));
            $txnRef = ($payment && $payment->transaction_reference) ? $payment->transaction_reference : 'TXN-DIRECT';

            $lines = [
                '🚨 TYUSHOP — PAYMENT & ORDER REPORT',
                '━━━━━━━━━━━━━━━━━━━━━━',
                "🧾 Order ID: #{$order->order_number}",
                "📄 Receipt No: #{$receiptNo}",
                "🔐 Transaction: {$txnRef}",
                "💳 Method: {$methodLabel}",
                "📌 Status: {$statusBadge}",
                "💰 Total Amount: \${$totalUsd} USD (≈ {$totalKhr} ៛)",
                '',
                '👤 CUSTOMER INFORMATION',
                '• Name: '.($order->customer_name ?: 'Valued Customer'),
                '• Phone: '.($order->customer_phone ?: 'N/A'),
                '• Email: '.($order->customer_email ?: 'N/A'),
                '• Address: '.($order->delivery_address ?: 'Phnom Penh, Cambodia'),
                '',
                '📦 ORDER ITEMS',
            ];

            foreach ($order->items as $item) {
                $itemTotal = number_format((float) $item->total_price, 2);
                $lines[] = "• {$item->quantity}x {$item->product_name} — \${$itemTotal}";
            }

            if ((float) ($order->discount ?? 0) > 0) {
                $lines[] = '🏷️ Discount: -$'.number_format((float) $order->discount, 2);
            }

            $lines[] = '';
            $lines[] = '🎁 Loyalty Points: +'.((int) ($order->points_earned ?? 5)).' pts';
            $lines[] = '🚚 GPS Tracking: https://tyushop.blog/track-order/'.$order->order_number;
            $lines[] = '🕒 Time: '.now()->format('Y-m-d H:i:s');

            $messageText = implode("\n", $lines);

            $targetChatIds = [];
            if ($this->adminChatId) {
                $targetChatIds[] = $this->adminChatId;
            }

            try {
                $adminAccounts = TelegramAccount::where('is_bot_admin', true)->pluck('telegram_user_id')->all();
                foreach ($adminAccounts as $accChatId) {
                    if ($accChatId && ! in_array((int) $accChatId, $targetChatIds, true)) {
                        $targetChatIds[] = (int) $accChatId;
                    }
                }
            } catch (\Throwable $e) {
                // Ignore if telegram_accounts table is unavailable
            }

            if (empty($targetChatIds)) {
                $targetChatIds[] = 5934277627;
            }

            $dispatched = false;
            foreach ($targetChatIds as $chatId) {
                $resp = $this->sendMessage($chatId, $messageText);
                if ($resp && ! empty($resp['ok'])) {
                    $dispatched = true;
                }
                try {
                    TelegramNotification::create([
                        'user_id' => $order->user_id,
                        'chat_id' => (int) $chatId,
                        'notification_type' => 'admin_payment_report',
                        'delivery_status' => ($resp && ! empty($resp['ok'])) ? 'sent' : 'logged',
                        'payload' => [
                            'order_number' => $order->order_number,
                            'receipt_number' => $receiptNo,
                            'total_amount' => $order->total_amount,
                            'payment_status' => $order->payment_status,
                        ],
                        'sent_at' => now(),
                    ]);
                } catch (\Throwable $e) {
                    // Ignore notification log error
                }
            }

            return $dispatched;
        } catch (\Throwable $e) {
            Log::error("Failed to dispatch Telegram Admin payment report for order #{$order->order_number}: {$e->getMessage()}");

            return false;
        }
    }
}
