# MegaCommerce — Telegram AI Shopping Bot & Mini App Integration Guide

## 1. Overview & Architecture

MegaCommerce is extended with a production-ready **Telegram AI Shopping Bot** and **Telegram Mini App**, built seamlessly into the existing Laravel 12 backend, PostgreSQL 18 database, and React 19 TypeScript Vite frontend.

### Key Architectural Pillars:
1. **Zero Data Invention & Real Shop Context**:
   - Product catalog, prices, categories, stock levels, and store details are queried directly from the PostgreSQL database (`store_settings`, `products`, `orders`, `receipts`).
2. **Cryptographically Secure Telegram Mini App Authentication**:
   - The backend validates `initData` using the official Telegram HMAC-SHA256 signature verification protocol (`secret_key = HMAC_SHA256("WebAppData", bot_token)`).
   - Enforces 24-hour timestamp verification (`auth_date`) to prevent replay attacks.
   - Never trusts unverified client-side data (`initDataUnsafe`).
3. **Bilingual AI Shopping Assistant (English & Khmer)**:
   - Integrated with Gemini AI function calling schema (with a deterministic local intent & catalog lookup engine fallback).
   - Equipped with real catalog tools: `searchProducts`, `getProductDetails`, `checkStock`, `getCategories`, `getActivePromotions`, `getCustomerOrder`, `getDeliveryStatus`, `getStorePolicies`.
4. **Staff Admin Telegram Console**:
   - Restricted to authenticated staff accounts and `TELEGRAM_ADMIN_CHAT_ID`.
   - Commands: `/admin`, `/stock <sku>`, `/lowstock`, `/sales`, `/pending`, `/deliveries`, `/report`.
   - Atomic inventory adjustments (`Product::adjustStock()`) with audit trail logging in `inventory_movements` and `telegram_admin_actions`.
5. **Bakong KHQR Branded PDF Receipts**:
   - Auto-generates official PDF receipts using Dompdf (`GET /api/v1/orders/{order}/receipt`).
   - Dispatches branded email confirmations with PDF attachments via `PaymentReceiptMail`.

---

## 2. Environment Variables & Setup

Update `backend/.env` with your real Telegram BotFather and AI credentials:

```ini
# Telegram Bot & Mini App
TELEGRAM_BOT_TOKEN=your_botfather_token_here
TELEGRAM_BOT_USERNAME=MegaCommerceAiBot
TELEGRAM_WEBHOOK_SECRET=your_custom_secure_secret_token
TELEGRAM_MINI_APP_URL=http://localhost:3000/telegram-app
TELEGRAM_ADMIN_CHAT_ID=your_telegram_numeric_id

# AI Provider Integration
AI_PROVIDER=gemini
AI_API_KEY=your_gemini_api_key
AI_MODEL=gemini-1.5-flash
```

---

## 3. BotFather Configuration Guide

### Step 1: Create Your Bot
1. Open Telegram and search for `@BotFather`.
2. Send `/newbot`.
3. Choose a name: `MegaCommerce Store`.
4. Choose a username: e.g. `MegaCommerceAiBot`.
5. Copy the generated Bot Token into `TELEGRAM_BOT_TOKEN` in `backend/.env`.

### Step 2: Configure Menu Button for Mini App
1. In `@BotFather`, send `/setmenubutton`.
2. Select your bot.
3. Enter the button text: `🛍️ Shop Now`.
4. Enter your deployed or ngrok HTTPS URL: `https://your-domain.com/telegram-app`.

### Step 3: Register Bot Commands
Send `/setcommands` to `@BotFather` and paste the following command list:

```text
start - Launch MegaCommerce Shopping Assistant
shop - Open MegaCommerce Mini App
products - Browse top featured products
categories - Explore product departments
orders - View your recent purchases
track - Track shipping status for an order
help - Shopping assistant guide and contact
admin - Staff admin dashboard & stock alerts
stock - Check inventory for a product SKU
lowstock - View low stock warning items
sales - Review daily and weekly revenue
pending - View pending order queue
deliveries - Track in-transit deliveries
report - Complete inventory & sales report
```

### Step 4: Configure Webhook
Set your HTTPS webhook URL with Telegram API:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-domain.com/api/v1/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

---

## 4. API Endpoints Reference

### Telegram & Mini App (`/api/v1/telegram/*`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/telegram/webhook` | Receives updates from Telegram servers (secret token verified) | Header |
| `POST` | `/api/v1/telegram/auth` | Authenticates Telegram `initData` HMAC-SHA256 signature | No |
| `GET` | `/api/v1/telegram/profile` | Fetches customer profile, orders count, and linked identity | Sanctum |
| `GET` | `/api/v1/telegram/products` | Catalog listing with filters (`category`, `tab`, `search`) | No |
| `GET` | `/api/v1/telegram/products/{id}` | Single product specifications and stock status | No |
| `GET` | `/api/v1/telegram/categories` | Department list with active product counts | No |
| `POST` | `/api/v1/telegram/ai/chat` | Bilingual AI Shopping Assistant chat with tool execution | Optional |
| `GET` | `/api/v1/telegram/admin/stock` | Staff stock inspection and low-stock filtering | Staff |
| `POST` | `/api/v1/telegram/admin/stock-adjust` | Atomic inventory adjustment with audit log | Staff |
| `GET` | `/api/v1/telegram/admin/sales-summary`| Revenue today/week/month and fulfillment counters | Staff |

### Store Settings & Invoices
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/store-settings` | Public store address, contact, policies, currency |
| `GET` | `/api/v1/orders/{order}/receipt` | Downloads official branded PDF receipt |
| `POST` | `/api/v1/admin/orders/{order}/resend-receipt` | Re-dispatches branded email receipt with PDF |

---

## 5. Verification & Test Results

### Backend Test Suite
Run tests with:
```powershell
$env:PATH = "C:\wamp\bin\php\php8.2.0;" + $env:PATH
cd D:\FinalLaravle\backend
php artisan test
```
Result: **29 passed, 0 failed, 92 assertions**.

### Frontend Production Build
Run build with:
```powershell
cd D:\FinalLaravle\frontend
npm run build
```
Result: **Built in 1.16s, 0 TypeScript errors**.

