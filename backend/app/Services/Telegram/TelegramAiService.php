<?php

namespace App\Services\Telegram;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\StoreSetting;
use App\Models\TelegramAccount;
use App\Models\TelegramAiMessage;
use App\Models\TelegramChatSession;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramAiService
{
    protected string $provider;

    protected string $apiKey;

    protected string $model;

    public function __construct()
    {
        $this->provider = (string) Config::get('telegram.ai.provider', 'gemini');
        $this->apiKey = (string) Config::get('telegram.ai.api_key', '');
        $this->model = (string) Config::get('telegram.ai.model', 'gemini-1.5-flash');
    }

    /**
     * Process a user chat message with context and available tools.
     */
    public function chat(
        TelegramAccount $account,
        string $userMessage,
        ?int $sessionId = null,
        string $language = 'en'
    ): array {
        // Resolve or create session
        $session = null;
        if ($sessionId) {
            $session = TelegramChatSession::where('id', $sessionId)
                ->where('telegram_account_id', $account->id)
                ->first();
        }

        if (! $session) {
            $session = TelegramChatSession::create([
                'telegram_account_id' => $account->id,
                'session_type' => $account->is_bot_admin ? 'admin' : 'customer',
                'context_data' => [
                    'language' => $language,
                    'customer_id' => $account->user_id,
                ],
            ]);
        }

        // Record User Message
        TelegramAiMessage::create([
            'session_id' => $session->id,
            'sender' => 'user',
            'message' => $userMessage,
        ]);

        // Attempt LLM with tool calling if API key configured, otherwise use internal deterministic tool engine
        if (! empty($this->apiKey) && $this->provider === 'gemini') {
            try {
                $response = $this->callGeminiWithTools($session, $userMessage, $account);

                return $response;
            } catch (\Throwable $e) {
                Log::warning("Gemini AI API call failed, falling back to local intent resolver: {$e->getMessage()}");
            }
        }

        // Deterministic Tool Engine & Local NLP Resolver
        return $this->resolveLocalToolsAndResponse($session, $userMessage, $account, $language);
    }

    /**
     * Local Tool Execution Engine.
     */
    public function executeTool(string $toolName, array $parameters, TelegramAccount $account): array
    {
        switch ($toolName) {
            case 'searchProducts':
                $query = trim($parameters['query'] ?? '');
                $categorySlug = $parameters['category'] ?? null;
                $limit = min((int) ($parameters['limit'] ?? 5), 10);

                $builder = Product::query()->where('is_active', true);

                if (! empty($query)) {
                    $cleaned = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $query);
                    $tokens = array_values(array_filter(explode(' ', $cleaned), fn ($t) => strlen($t) >= 3));

                    if (! empty($tokens)) {
                        $builder->where(function ($q) use ($tokens) {
                            foreach ($tokens as $token) {
                                $searchLower = '%'.strtolower($token).'%';
                                $q->orWhereRaw('LOWER(name) LIKE ?', [$searchLower])
                                    ->orWhereRaw('LOWER(sku) LIKE ?', [$searchLower])
                                    ->orWhereRaw('LOWER(brand) LIKE ?', [$searchLower])
                                    ->orWhereRaw('LOWER(description) LIKE ?', [$searchLower]);
                            }
                        });
                    } else {
                        $searchLower = '%'.strtolower($query).'%';
                        $builder->where(function ($q) use ($searchLower) {
                            $q->whereRaw('LOWER(name) LIKE ?', [$searchLower])
                                ->orWhereRaw('LOWER(sku) LIKE ?', [$searchLower])
                                ->orWhereRaw('LOWER(brand) LIKE ?', [$searchLower])
                                ->orWhereRaw('LOWER(description) LIKE ?', [$searchLower]);
                        });
                    }
                }

                if ($categorySlug) {
                    $builder->whereHas('category', function ($q) use ($categorySlug) {
                        $q->where('slug', $categorySlug)
                            ->orWhereRaw('LOWER(name) LIKE ?', ['%'.strtolower($categorySlug).'%']);
                    });
                }

                $products = $builder->orderByDesc('is_featured')->limit($limit)->get();

                return [
                    'count' => $products->count(),
                    'products' => $products->map(function (Product $p) {
                        return [
                            'id' => $p->id,
                            'sku' => $p->sku,
                            'name' => $p->name,
                            'price' => (float) $p->price,
                            'discount_price' => $p->discount_price ? (float) $p->discount_price : null,
                            'stock_quantity' => $p->stock_quantity,
                            'in_stock' => $p->stock_quantity > 0,
                            'category' => $p->category ? $p->category->name : null,
                            'image_url' => $p->image_url,
                        ];
                    })->toArray(),
                ];

            case 'getProductDetails':
                $identifier = trim((string) ($parameters['sku_or_id'] ?? ''));
                $product = is_numeric($identifier)
                    ? Product::with(['category', 'brandRecord'])->find((int) $identifier)
                    : Product::with(['category', 'brandRecord'])->where('sku', strtoupper($identifier))->orWhere('slug', $identifier)->first();

                if (! $product) {
                    return ['error' => "Product '{$identifier}' not found in catalog."];
                }

                return [
                    'id' => $product->id,
                    'sku' => $product->sku,
                    'name' => $product->name,
                    'price' => (float) $product->price,
                    'discount_price' => $product->discount_price ? (float) $product->discount_price : null,
                    'stock_quantity' => $product->stock_quantity,
                    'in_stock' => $product->stock_quantity > 0,
                    'description' => $product->description,
                    'category' => $product->category ? $product->category->name : null,
                    'brand' => $product->brand ?? ($product->brandRecord ? $product->brandRecord->name : null),
                    'is_featured' => $product->is_featured,
                    'specifications' => $product->specifications,
                ];

            case 'checkStock':
                $identifier = trim((string) ($parameters['sku_or_id'] ?? ''));
                $product = is_numeric($identifier)
                    ? Product::find((int) $identifier)
                    : Product::where('sku', strtoupper($identifier))->orWhere('slug', $identifier)->first();

                if (! $product) {
                    return ['error' => "Product '{$identifier}' not found."];
                }

                return [
                    'sku' => $product->sku,
                    'name' => $product->name,
                    'stock_quantity' => $product->stock_quantity,
                    'in_stock' => $product->stock_quantity > 0,
                    'is_low_stock' => $product->stock_quantity <= $product->low_stock_threshold,
                ];

            case 'getCategories':
                $categories = Category::where('is_active', true)
                    ->withCount(['products' => function ($q) {
                        $q->where('is_active', true);
                    }])
                    ->get();

                return [
                    'categories' => $categories->map(function ($c) {
                        return [
                            'id' => $c->id,
                            'name' => $c->name,
                            'slug' => $c->slug,
                            'product_count' => $c->products_count,
                        ];
                    })->toArray(),
                ];

            case 'getActivePromotions':
                $discounted = Product::where('is_active', true)
                    ->whereNotNull('discount_price')
                    ->whereColumn('discount_price', '<', 'price')
                    ->limit(5)
                    ->get();

                return [
                    'promotions' => $discounted->map(function (Product $p) {
                        $savings = round(((float) $p->price - (float) $p->discount_price), 2);

                        return [
                            'name' => $p->name,
                            'sku' => $p->sku,
                            'regular_price' => (float) $p->price,
                            'sale_price' => (float) $p->discount_price,
                            'savings' => $savings,
                        ];
                    })->toArray(),
                ];

            case 'getCustomerOrder':
            case 'getDeliveryStatus':
                $orderNumber = trim((string) ($parameters['order_number'] ?? ''));
                $order = Order::with('items')->where('order_number', $orderNumber)->first();

                if (! $order) {
                    return ['error' => "Order #{$orderNumber} was not found."];
                }

                return [
                    'order_number' => $order->order_number,
                    'fulfillment_status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'total_amount' => (float) $order->total_amount,
                    'shipping_method' => $order->shipping_method,
                    'tracking_number' => $order->tracking_number,
                    'carrier' => $order->shipping_carrier,
                    'city' => $order->shipping_city,
                    'item_count' => $order->items->count(),
                ];

            case 'getStorePolicies':
                $policyType = strtolower(trim((string) ($parameters['policy_type'] ?? 'all')));
                $settings = StoreSetting::getAll();

                if ($policyType === 'return' || $policyType === 'refund') {
                    return [
                        'return_policy_days' => $settings['return_policy_days'] ?? 7,
                        'policy' => "TYUSHOP offers a {$settings['return_policy_days']}-day return policy for unopened items in original packaging.",
                    ];
                }

                if ($policyType === 'shipping' || $policyType === 'delivery') {
                    return [
                        'shipping_policy' => $settings['shipping_policy'] ?? 'Express shipping nationwide across Cambodia.',
                    ];
                }

                return [
                    'store_name' => $settings['store_name'] ?? 'TYUSHOP Flagship',
                    'address' => $settings['store_address'] ?? 'Phnom Penh, Cambodia',
                    'support_email' => $settings['support_email'] ?? 'Vothanarern@gmail.com',
                    'contact_phone' => $settings['contact_phone'] ?? '016 555 637',
                    'return_policy_days' => $settings['return_policy_days'] ?? 7,
                    'shipping_policy' => $settings['shipping_policy'] ?? 'Free express shipping on all orders exceeding $50.',
                ];

            case 'createSupportTicket':
                $subject = $parameters['subject'] ?? 'General Inquiry';

                return [
                    'status' => 'received',
                    'ticket_id' => 'TCK-'.strtoupper(bin2hex(random_bytes(4))),
                    'subject' => $subject,
                    'message' => 'Our support team will follow up within 2 hours.',
                ];

            default:
                return ['error' => "Unknown tool: {$toolName}"];
        }
    }

    /**
     * Fallback Local Natural Language & Tool Intent Resolver.
     */
    protected function resolveLocalToolsAndResponse(
        TelegramChatSession $session,
        string $text,
        TelegramAccount $account,
        string $language
    ): array {
        $lower = strtolower($text);
        $storeName = StoreSetting::get('store_name', 'TYUSHOP Flagship');
        $isKhmer = ($language === 'km' || preg_match('/[\x{1780}-\x{17FF}]/u', $text));

        $toolCalls = [];
        $replyText = '';

        // Check for Order Lookup (e.g. ORD-2026-9041 or "order #...")
        if (preg_match('/ORD-[0-9]{4}-[0-9]{4}/i', $text, $matches)) {
            $orderNo = strtoupper($matches[0]);
            $toolResult = $this->executeTool('getDeliveryStatus', ['order_number' => $orderNo], $account);
            $toolCalls[] = ['tool' => 'getDeliveryStatus', 'params' => ['order_number' => $orderNo], 'result' => $toolResult];

            if (isset($toolResult['error'])) {
                $replyText = $isKhmer
                    ? "សូមអភ័យទោស ការបញ្ជាទិញ #{$orderNo} មិនត្រូវបានរកឃើញនៅក្នុងប្រព័ន្ធរបស់យើងទេ។"
                    : "I couldn't find order #{$orderNo} in our system. Please double check the order number.";
            } else {
                $status = strtoupper($toolResult['fulfillment_status']);
                $payment = strtoupper($toolResult['payment_status']);
                $tracking = $toolResult['tracking_number'] ?? 'Not yet dispatched';

                $replyText = $isKhmer
                    ? "📦 **ព័ត៌មានលម្អិតអំពីការបញ្ជាទិញ #{$orderNo}**\n\n"
                    ."• ស្ថានភាពដឹកជញ្ជូន: **{$status}**\n"
                    ."• ការទូទាត់: **{$payment}**\n"
                    ."• ទឹកប្រាក់សរុប: \${$toolResult['total_amount']}\n"
                    ."• លេខកូដតាមដាន: `{$tracking}`\n"
                    ."• ទីក្រុងដឹកជញ្ជូន: {$toolResult['city']}"
                    : "📦 **Order Status for #{$orderNo}**\n\n"
                    ."• Fulfillment Status: **{$status}**\n"
                    ."• Payment Status: **{$payment}**\n"
                    ."• Total Amount: `\${$toolResult['total_amount']}`\n"
                    ."• Tracking Code: `{$tracking}`\n"
                    ."• Delivery Destination: {$toolResult['city']}";
            }
        }
        // Check for Return / Refund / Shipping Policy
        elseif (str_contains($lower, 'policy') || str_contains($lower, 'return') || str_contains($lower, 'refund') || str_contains($lower, 'ship') || str_contains($lower, 'ដឹកជញ្ជូន') || str_contains($lower, 'ប្តូរ')) {
            $toolResult = $this->executeTool('getStorePolicies', ['policy_type' => 'all'], $account);
            $toolCalls[] = ['tool' => 'getStorePolicies', 'params' => [], 'result' => $toolResult];

            $replyText = $isKhmer
                ? "📜 **គោលការណ៍ហាង {$storeName}**\n\n"
                ."• ការប្តូរទំនិញវិញ: រយៈពេល {$toolResult['return_policy_days']} ថ្ងៃ សម្រាប់ផលិតផលដែលមិនទាន់បើកប្រអប់។\n"
                ."• ការដឹកជញ្ជូន: {$toolResult['shipping_policy']}\n"
                ."• ទំនាក់ទំនងផ្នែកជំនួយ: {$toolResult['support_email']} ឬទូរស័ព្ទ {$toolResult['contact_phone']}"
                : "📜 **{$storeName} Store Policies**\n\n"
                ."• **Return Period:** {$toolResult['return_policy_days']} days for unused items in original sealed packaging.\n"
                ."• **Shipping:** {$toolResult['shipping_policy']}\n"
                ."• **Support:** {$toolResult['support_email']} or {$toolResult['contact_phone']}";
        }
        // Check for Categories
        elseif (str_contains($lower, 'category') || str_contains($lower, 'categories') || str_contains($lower, 'ប្រភេទ')) {
            $toolResult = $this->executeTool('getCategories', [], $account);
            $toolCalls[] = ['tool' => 'getCategories', 'params' => [], 'result' => $toolResult];

            $catList = array_map(fn ($c) => "• **{$c['name']}** ({$c['product_count']} items)", $toolResult['categories']);
            $joined = implode("\n", $catList);

            $replyText = $isKhmer
                ? "📂 **ប្រភេទផលិតផលទាំងអស់ក្នុងហាង:**\n\n{$joined}\n\nតើអ្នកចង់មើលផលិតផលណាមួយទេ?"
                : "📂 **Available Categories at {$storeName}:**\n\n{$joined}\n\nWould you like to search products in any of these categories?";
        }
        // Check for Deals / Promotions
        elseif (str_contains($lower, 'promotion') || str_contains($lower, 'discount') || str_contains($lower, 'deal') || str_contains($lower, 'បញ្ចុះតម្លៃ')) {
            $toolResult = $this->executeTool('getActivePromotions', [], $account);
            $toolCalls[] = ['tool' => 'getActivePromotions', 'params' => [], 'result' => $toolResult];

            if (empty($toolResult['promotions'])) {
                $replyText = $isKhmer
                    ? 'បច្ចុប្បន្ននេះ យើងមានតម្លៃពិសេសលើផលិតផលទាំងអស់ក្នុងហាង។ សូមចូលទៅកាន់ Mini App ដើម្បីពិនិត្យមើល!'
                    : 'We have competitive regular prices across all categories. Check out our Mini App for the latest offers!';
            } else {
                $items = array_map(fn ($p) => "• **{$p['name']}**: `\${$p['sale_price']}` (Save `\${$p['savings']}`)", $toolResult['promotions']);
                $joined = implode("\n", $items);
                $replyText = $isKhmer
                    ? "🔥 **ប្រូម៉ូសិនពិសេសប្រចាំថ្ងៃ:**\n\n{$joined}\n\nអាចកុម្ម៉ង់បានភ្លាមៗតាមរយៈ Mini App!"
                    : "🔥 **Today's Hot Deals:**\n\n{$joined}\n\nTap the Mini App button to order right away!";
            }
        }
        // Product Search / Stock Inquiries
        else {
            // Extract potential product search term
            $cleanTerm = trim(preg_replace('/^(search|find|show me|do you have|stock of|is there|buy|តម្លៃ|ទិញ)\s+/i', '', $lower));
            $searchTerm = strlen($cleanTerm) >= 2 ? $cleanTerm : '';

            $toolResult = $this->executeTool('searchProducts', ['query' => $searchTerm, 'limit' => 4], $account);
            $toolCalls[] = ['tool' => 'searchProducts', 'params' => ['query' => $searchTerm], 'result' => $toolResult];

            if ($toolResult['count'] === 0) {
                $replyText = $isKhmer
                    ? "ខ្ញុំមិនបានរកឃើញផលិតផលដែលត្រូវនឹង '{$text}' ទេ។ អ្នកអាចសួរអំពីម៉ាកល្បីៗ (Nike, Apple, Sony), សំលៀកបំពាក់, គ្រឿងសង្ហារឹម, ម្ហូបអាហារ ឬវាយ 'categories' ដើម្បីមើល 26 ផ្នែកទំនិញទាំងអស់។"
                    : "I couldn't find any products matching your query. You can search across all 26 departments (electronics, fashion, furniture, groceries, health, books, etc.) or type 'categories' to explore.";
            } else {
                $items = array_map(function ($p) {
                    $stock = $p['in_stock'] ? "✅ In Stock ({$p['stock_quantity']})" : '❌ Out of Stock';

                    return "• **{$p['name']}** (`{$p['sku']}`)\n  Price: `\${$p['price']}` | {$stock}";
                }, $toolResult['products']);
                $joined = implode("\n\n", $items);

                $replyText = $isKhmer
                    ? "✨ **ផលិតផលដែលអ្នកប្រហែលជាចាប់អារម្មណ៍:**\n\n{$joined}\n\nអ្នកអាចចុចបើក Mini App ដើម្បីពិនិត្យលម្អិត និងទូទាត់ជាមួយ Bakong KHQR បានយ៉ាងងាយស្រួល!"
                    : "✨ **Here are relevant items from our catalog:**\n\n{$joined}\n\nTap the Mini App button below to view full details and checkout with Bakong KHQR!";
            }
        }

        // Record Assistant Message
        TelegramAiMessage::create([
            'session_id' => $session->id,
            'sender' => 'assistant',
            'message' => $replyText,
            'tool_calls' => $toolCalls,
        ]);

        return [
            'session_id' => $session->id,
            'message' => $replyText,
            'tool_calls' => $toolCalls,
        ];
    }

    /**
     * Gemini LLM with function calling schema.
     */
    protected function callGeminiWithTools(TelegramChatSession $session, string $userMessage, TelegramAccount $account): array
    {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$this->apiKey}";

        // Retrieve last 6 messages from session
        $history = TelegramAiMessage::where('session_id', $session->id)
            ->orderBy('id', 'desc')
            ->limit(6)
            ->get()
            ->reverse();

        $contents = [];
        foreach ($history as $msg) {
            $contents[] = [
                'role' => $msg->sender === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $msg->message]],
            ];
        }

        $storeInfo = StoreSetting::getAll();

        $systemInstruction = "You are the AI Shopping Assistant for {$storeInfo['store_name']}, a universal marketplace featuring 26 product departments (Electronics, Fashion, Groceries, Home & Living, Furniture, Books, Sports, Baby, and more). "
            ."Address: {$storeInfo['store_address']}. Support: {$storeInfo['support_email']}, {$storeInfo['contact_phone']}. "
            .'Always be courteous, provide accurate prices and real stock from the store catalog, and support both English and Khmer. '
            .'Never invent products, prices, or store info. Always use real catalog data.';

        $tools = [
            [
                'function_declarations' => [
                    [
                        'name' => 'searchProducts',
                        'description' => 'Search products in catalog by name, category, or keyword.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'query' => ['type' => 'STRING', 'description' => 'Search keyword, product name, or brand'],
                            ],
                        ],
                    ],
                    [
                        'name' => 'checkStock',
                        'description' => 'Check stock inventory for a product SKU or ID.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'sku_or_id' => ['type' => 'STRING', 'description' => 'Product SKU or numeric ID'],
                            ],
                            'required' => ['sku_or_id'],
                        ],
                    ],
                    [
                        'name' => 'getStorePolicies',
                        'description' => 'Get store return, refund, or shipping policies.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'policy_type' => ['type' => 'STRING', 'description' => 'all, return, or shipping'],
                            ],
                        ],
                    ],
                    [
                        'name' => 'getCustomerOrder',
                        'description' => 'Lookup order details by order number.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'order_number' => ['type' => 'STRING', 'description' => 'e.g. ORD-2026-9041'],
                            ],
                            'required' => ['order_number'],
                        ],
                    ],
                ],
            ],
        ];

        $payload = [
            'system_instruction' => [
                'parts' => [['text' => $systemInstruction]],
            ],
            'contents' => $contents,
            'tools' => $tools,
        ];

        $response = Http::timeout(15)->post($url, $payload);

        if (! $response->successful()) {
            throw new \RuntimeException('Gemini API error: '.$response->body());
        }

        $data = $response->json();
        $candidates = $data['candidates'] ?? [];
        $firstCandidate = $candidates[0] ?? [];
        $parts = $firstCandidate['content']['parts'] ?? [];

        $toolCallsExecuted = [];
        $assistantText = '';

        foreach ($parts as $part) {
            if (isset($part['functionCall'])) {
                $funcName = $part['functionCall']['name'];
                $funcArgs = $part['functionCall']['args'] ?? [];
                $result = $this->executeTool($funcName, $funcArgs, $account);
                $toolCallsExecuted[] = [
                    'tool' => $funcName,
                    'params' => $funcArgs,
                    'result' => $result,
                ];
            }
            if (isset($part['text'])) {
                $assistantText .= $part['text'];
            }
        }

        if (! empty($toolCallsExecuted) && empty($assistantText)) {
            $formattedToolOutput = json_encode($toolCallsExecuted);
            $assistantText = "Here is the information from our store catalog:\n".$formattedToolOutput;
        }

        TelegramAiMessage::create([
            'session_id' => $session->id,
            'sender' => 'assistant',
            'message' => $assistantText ?: "I'm here to help with any product or order questions!",
            'tool_calls' => $toolCallsExecuted,
        ]);

        return [
            'session_id' => $session->id,
            'message' => $assistantText,
            'tool_calls' => $toolCallsExecuted,
        ];
    }
}
