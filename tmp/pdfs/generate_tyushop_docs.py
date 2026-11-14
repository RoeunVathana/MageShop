from __future__ import annotations

import html
import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.colors import HexColor


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "tyushop-technical-documentation.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

FONT_REGULAR = r"C:\Windows\Fonts\KhmerOSsys.ttf"
FONT_BOLD = r"C:\Windows\Fonts\KhmerOSbattambang.ttf"
FONT_MONO = r"C:\Windows\Fonts\consola.ttf"
FONT_MONO_BOLD = r"C:\Windows\Fonts\consolab.ttf"

for name, path in [
    ("KhmerOS", FONT_REGULAR),
    ("KhmerOS-Bold", FONT_BOLD),
    ("Consolas", FONT_MONO),
    ("Consolas-Bold", FONT_MONO_BOLD),
]:
    if os.path.exists(path):
        pdfmetrics.registerFont(TTFont(name, path))


NAVY = HexColor("#10213f")
BLUE = HexColor("#2563eb")
CYAN = HexColor("#0ea5e9")
PURPLE = HexColor("#6d28d9")
GREEN = HexColor("#059669")
AMBER = HexColor("#d97706")
RED = HexColor("#dc2626")
INK = HexColor("#182236")
MUTED = HexColor("#52627a")
LIGHT = HexColor("#f4f7fb")
LINE = HexColor("#d9e1ef")
WHITE = colors.white


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text, style)


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverTitle", fontName="KhmerOS-Bold", fontSize=28, leading=34,
    textColor=WHITE, alignment=TA_CENTER, spaceAfter=12,
))
styles.add(ParagraphStyle(
    name="CoverSub", fontName="KhmerOS", fontSize=13, leading=19,
    textColor=HexColor("#dbeafe"), alignment=TA_CENTER, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="H1x", fontName="KhmerOS-Bold", fontSize=18, leading=24,
    textColor=NAVY, spaceBefore=8, spaceAfter=9,
))
styles.add(ParagraphStyle(
    name="H2x", fontName="KhmerOS-Bold", fontSize=13, leading=18,
    textColor=BLUE, spaceBefore=8, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="H3x", fontName="KhmerOS-Bold", fontSize=10.5, leading=15,
    textColor=PURPLE, spaceBefore=6, spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="Bodyx", fontName="KhmerOS", fontSize=9.2, leading=14,
    textColor=INK, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="Smallx", fontName="KhmerOS", fontSize=7.7, leading=10.5,
    textColor=MUTED, spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="Cellx", fontName="KhmerOS", fontSize=7.5, leading=10.2,
    textColor=INK,
))
styles.add(ParagraphStyle(
    name="CellHeadx", fontName="KhmerOS-Bold", fontSize=7.5, leading=10.2,
    textColor=WHITE,
))
styles.add(ParagraphStyle(
    name="CodeBlockx", fontName="Consolas", fontSize=7.0, leading=9.5,
    textColor=HexColor("#e5e7eb"), backColor=HexColor("#111827"),
    borderColor=HexColor("#273449"), borderWidth=0.5, borderPadding=7,
    spaceBefore=4, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="QuoteX", fontName="KhmerOS", fontSize=8.7, leading=13,
    textColor=MUTED, leftIndent=10, borderColor=CYAN, borderWidth=2,
    borderPadding=7, spaceBefore=4, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="TOCx", fontName="KhmerOS", fontSize=10, leading=16,
    textColor=INK, leftIndent=8, spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="Footerx", fontName="KhmerOS", fontSize=7.2, leading=9,
    textColor=MUTED,
))


def body(text: str) -> Paragraph:
    return p(text, styles["Bodyx"])


def h1(text: str) -> Paragraph:
    return p(text, styles["H1x"])


def h2(text: str) -> Paragraph:
    return p(text, styles["H2x"])


def h3(text: str) -> Paragraph:
    return p(text, styles["H3x"])


def small(text: str) -> Paragraph:
    return p(text, styles["Smallx"])


def code(text: str) -> Paragraph:
    return p(esc(text).replace("\n", "<br/>"), styles["CodeBlockx"])


def bullet(text: str) -> Paragraph:
    return p(f"<font color='{BLUE.hexval()}'><b>-</b></font> {text}", styles["Bodyx"])


def table(headers, rows, widths, font_size=7.5):
    data = [[p(esc(x), styles["CellHeadx"]) for x in headers]]
    for row in rows:
        data.append([p(esc(x), styles["Cellx"]) for x in row])
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
    ]))
    return t


class DocTemplate(BaseDocTemplate):
    def __init__(self, filename, **kwargs):
        super().__init__(filename, **kwargs)
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates([PageTemplate(id="main", frames=frame, onPage=self.draw_page)])

    def draw_page(self, canvas, doc):
        canvas.saveState()
        if doc.page > 1:
            canvas.setStrokeColor(LINE)
            canvas.setLineWidth(0.5)
            canvas.line(doc.leftMargin, A4[1] - 17 * mm, A4[0] - doc.rightMargin, A4[1] - 17 * mm)
            canvas.setFont("KhmerOS-Bold", 7.5)
            canvas.setFillColor(NAVY)
            canvas.drawString(doc.leftMargin, A4[1] - 13 * mm, "TYUSHOP Technical Documentation")
            canvas.setFont("KhmerOS", 7.2)
            canvas.setFillColor(MUTED)
            canvas.drawRightString(A4[0] - doc.rightMargin, A4[1] - 13 * mm, "API | Frontend | Roles")
        canvas.setStrokeColor(LINE)
        canvas.line(doc.leftMargin, 14 * mm, A4[0] - doc.rightMargin, 14 * mm)
        canvas.setFont("KhmerOS", 7)
        canvas.setFillColor(MUTED)
        canvas.drawString(doc.leftMargin, 9 * mm, "Internal implementation reference - generated from current repository")
        canvas.drawRightString(A4[0] - doc.rightMargin, 9 * mm, f"Page {doc.page}")
        canvas.restoreState()


story = []

# Cover
story.append(Spacer(1, 30 * mm))
cover_table = Table([
    [p("TYUSHOP", styles["CoverTitle"])],
    [p("Technical Documentation", styles["CoverSub"])],
    [p("API, Frontend Architecture, Roles & Permissions", styles["CoverSub"])],
    [p("Detailed reference for developers and administrators", styles["CoverSub"])],
    [Spacer(1, 8 * mm)],
    [p("Repository revision: d1c1e2d", styles["CoverSub"])],
    [p("Generated: 13 November 2026", styles["CoverSub"])],
], colWidths=[150 * mm], hAlign="CENTER")
cover_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), NAVY),
    ("BOX", (0, 0), (-1, -1), 1, CYAN),
    ("TOPPADDING", (0, 0), (-1, -1), 10),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ("LEFTPADDING", (0, 0), (-1, -1), 14),
    ("RIGHTPADDING", (0, 0), (-1, -1), 14),
]))
story.append(cover_table)
story.append(Spacer(1, 12 * mm))
story.append(p("Purpose", styles["H2x"]))
story.append(body("This document explains how TYUSHOP works from the React storefront and dashboards through the Laravel REST API, authentication, checkout, Bakong KHQR, delivery, and role/permission governance. It is based on the current source code and is intended for onboarding, debugging, and production operations."))
story.append(PageBreak())

# Contents and system map
story.append(h1("1. Contents and system overview"))
for line in [
    "1.1 Architecture and technology stack",
    "1.2 Frontend structure, routes, and access guards",
    "1.3 API reference and request flow",
    "1.4 Authentication, OTP, and Google login",
    "1.5 Checkout, Bakong KHQR, and payment confirmation",
    "1.6 Roles, permissions, and access governance",
    "1.7 Admin dashboard and operational workflows",
    "1.8 Security, performance, and troubleshooting",
]:
    story.append(p(line, styles["TOCx"]))
story.append(Spacer(1, 6))
story.append(h2("System map"))
story.append(table(
    ["Layer", "Implementation", "Responsibilities"],
    [
        ["Browser / Mobile", "React 19 + TypeScript + Vite", "Storefront, checkout, dashboards, responsive UI"],
        ["Routing", "React Router 7", "Public routes, auth routes, protected role routes"],
        ["Data client", "Axios + TanStack Query + Context", "API requests, caching, checkout state, cart, language and currency"],
        ["API", "Laravel 12 / PHP 8.2+", "REST endpoints under /api/v1, validation, authorization, business rules"],
        ["Auth", "Laravel Sanctum + Firebase/Socialite", "Bearer token, cookies, CSRF, Google and OTP flows"],
        ["Data", "PostgreSQL + Redis/Predis", "Relational commerce data, cache and queue support"],
        ["Payments", "Bakong NBC API + KHQR", "Generate QR, verify transaction by MD5, match amount/currency/merchant"],
    ], [30 * mm, 53 * mm, 83 * mm]
))
story.append(Spacer(1, 7))
story.append(p("Canonical production domains", styles["H2x"]))
story.append(table(
    ["Address", "Use"],
    [
        ["https://tyushop.blog", "Public storefront and browser UI"],
        ["https://api.tyushop.blog/api/v1", "Custom API domain for authentication and mutations"],
        ["https://mageshop-production.up.railway.app/api/v1", "Direct Railway API used for public catalog reads and fallback"],
        ["https://api.tyushop.blog/sanctum/csrf-cookie", "Sanctum CSRF cookie initialization"],
    ], [75 * mm, 91 * mm]
))
story.append(PageBreak())

# Architecture
story.append(h1("2. Architecture and technology stack"))
story.append(body("TYUSHOP is a multi-vendor marketplace. The frontend is a single-page application (SPA) split into lazy-loaded route chunks. The backend is a Laravel REST API using PostgreSQL as the relational store, Redis as an optional cache/queue layer, and a local or S3 storage disk for media."))
story.append(code("Browser -> React/Vite -> Axios -> Laravel /api/v1 -> PostgreSQL\n                                           -> Redis / Queue\n                                           -> Bakong NBC API\n                                           -> Storage / PDF receipts"))
story.append(h2("Technology details"))
story.append(table(
    ["Area", "Technology", "Implementation notes"],
    [
        ["Frontend", "React 19, TypeScript, Vite 8", "Entry point frontend/src/App.tsx; route-level lazy imports keep first load smaller."],
        ["Styling", "Tailwind CSS v3, Radix UI, design tokens", "Responsive storefront, dashboard cards, dialogs, tables and dark/light theme."],
        ["Data fetching", "Axios, TanStack Query v5", "Five-minute query stale time; API client normalizes errors and handles 401/419."],
        ["State", "React Context, Zustand dependency", "Cart, favorites, loyalty, language and currency are held in ShopEngagementContext."],
        ["Backend", "Laravel 12, PHP 8.2+", "API routes are in backend/routes/api.php and are prefixed by /api/v1."],
        ["Database", "PostgreSQL via PDO", "Migrations define users, roles, permissions, products, orders, payments and settings."],
        ["Auth", "Sanctum, Socialite/Firebase", "Bearer token is attached to API calls; CSRF cookie is initialized before mutations."],
        ["Documents", "Dompdf", "Order receipts are available through authenticated receipt endpoints."],
    ], [30 * mm, 46 * mm, 90 * mm]
))
story.append(h2("Important request routing behavior"))
for line in [
    "The custom API domain is the default API base for tyushop.blog and for authenticated operations.",
    "Public catalog reads use the direct Railway API to reduce edge latency and avoid an extra CORS preflight.",
    "Mutating requests call initCsrf() first, then send the Sanctum Bearer token when one exists.",
    "A 419 response refreshes the CSRF cookie and retries once. A 401 clears the stored session and redirects to /login with a redirect query.",
    "Checkout sends an idempotency key so a network timeout does not create duplicate orders.",
]:
    story.append(bullet(esc(line)))
story.append(PageBreak())

# Frontend
story.append(h1("3. Frontend: pages, routing, and data flow"))
story.append(body("The frontend entry point is frontend/src/App.tsx. The app wraps its routes with QueryClientProvider, ThemeProvider, ShopEngagementProvider, ToastProvider, Router, ScrollToTop, and SeoHead. Major pages are lazy-imported to reduce the initial bundle."))
story.append(h2("Public storefront routes"))
story.append(table(
    ["Route", "Page", "Access"],
    [
        ["/", "HomePage", "Public"],
        ["/products", "ProductsPage", "Public"],
        ["/products/:slug", "ProductDetailPage", "Public"],
        ["/categories", "CategoriesPage", "Public"],
        ["/brands", "BrandsPage", "Public"],
        ["/cart", "CartPage", "Public page; checkout requires authentication"],
        ["/wishlist", "WishlistPage", "Public view; actions may require authentication"],
        ["/track-order/:orderNumber", "TrackOrderPage", "Authenticated tracking"],
        ["/about, /contact, /faq", "Informational pages", "Public"],
        ["/sell, /seller/join", "JoinSellerPage", "Public seller application"],
        ["/telegram-app", "TelegramApp", "Telegram Mini App entry"],
    ], [44 * mm, 54 * mm, 68 * mm]
))
story.append(h2("Authentication and account routes"))
story.append(table(
    ["Route", "Purpose"],
    [
        ["/login", "Email/password and Google/Firebase sign-in"],
        ["/register", "Create customer account"],
        ["/forgot-password", "Request email OTP"],
        ["/verify-otp", "Verify six-digit OTP"],
        ["/reset-password", "Set new password using reset token"],
        ["/profile, /account, /orders", "Authenticated profile and customer portal"],
    ], [55 * mm, 111 * mm]
))
story.append(PageBreak())
story.append(h2("Dashboard and protected routes"))
story.append(table(
    ["Route family", "Guard", "Main purpose"],
    [
        ["/dashboard/admin", "AdminOnlyRoute", "Platform overview and management"],
        ["/dashboard/seller", "AdminOrSellerRoute", "Seller storefront and reports"],
        ["/dashboard/staff", "StaffOrAdminRoute", "Staff operations"],
        ["/dashboard/delivery", "DeliveryOrAdminRoute", "Fleet, dispatch, live GPS"],
        ["/dashboard/warehouse", "WarehouseOrAdminRoute", "Warehouse and inventory"],
        ["/admin/products, /admin/coupons", "AdminOrSellerRoute", "Product and promotion CRUD"],
        ["/admin/categories, /admin/brands", "AdminOnlyRoute", "Taxonomy and brand governance"],
        ["/admin/orders, /admin/sellers", "AdminOnlyRoute", "Orders, disputes and seller approval"],
        ["/admin/settings, /admin/security", "AdminOnlyRoute", "Global settings, tokens and security"],
    ], [45 * mm, 44 * mm, 77 * mm]
))
story.append(PageBreak())

# Guards and frontend details
story.append(h1("4. Frontend guards, state, and performance"))
story.append(h2("Route guard behavior"))
story.append(table(
    ["Guard", "Allowed roles", "When denied"],
    [
        ["AuthenticatedRoute", "Any authenticated user", "Redirects to /login and preserves source route"],
        ["AdminOnlyRoute", "SUPER_ADMIN or ADMIN", "Unauthenticated -> /login; non-admin -> /"],
        ["AdminOrSellerRoute", "Admin, SELLER, SELLER_STAFF", "Unauthenticated -> /login; others -> /"],
        ["StaffOrAdminRoute", "Admin, STAFF, ORDER_MANAGER, SUPPORT, LOGISTICS, DISPATCHER and aliases", "Unauthenticated -> /login; others -> /"],
        ["DeliveryOrAdminRoute", "Admin, delivery, dispatcher, logistics and staff roles", "Shows delivery-access explanation or redirects"],
        ["WarehouseOrAdminRoute", "Admin, WAREHOUSE_MANAGER, INVENTORY_MANAGER", "Redirects to /"],
    ], [38 * mm, 70 * mm, 58 * mm]
))
story.append(h2("Client state"))
story.append(table(
    ["State", "Storage / owner", "Behavior"],
    [
        ["Cart", "localStorage: megacommerce_cart_v2", "Quantity, subtotal, clearCart after successful order"],
        ["Favorites", "localStorage: megacommerce_favorites_v2", "Wishlist UI and toggle actions"],
        ["Language", "localStorage: megacommerce_language", "EN or KM; helper t(en, km)"],
        ["Currency", "localStorage + StoreSettings", "USD/KHR, exchange rate and allowed modes"],
        ["Session", "localStorage: tyushop_auth_user/token", "Cached profile plus API Bearer token"],
        ["Query cache", "TanStack Query", "Default staleTime is five minutes, refetch-on-focus disabled"],
    ], [38 * mm, 58 * mm, 70 * mm]
))
story.append(h2("Performance safeguards already present"))
for line in [
    "Lazy route imports: admin and dashboard code is loaded only when the user opens that area.",
    "Public catalog requests use publicApiClient and the direct Railway API by default.",
    "Axios timeout is 60 seconds for the main client and 20 seconds for public catalog reads.",
    "Checkout supports safe retry using idempotency_key; it should never blindly retry an unknown mutation without idempotency.",
    "ScrollToTop listens to pathname and search changes, so navigation starts at the top of the new page.",
]:
    story.append(bullet(esc(line)))
story.append(PageBreak())

# API basics and auth
story.append(h1("5. API reference: conventions and authentication"))
story.append(h2("Request conventions"))
story.append(code("Accept: application/json\nContent-Type: application/json\nX-Requested-With: XMLHttpRequest\nAuthorization: Bearer <sanctum-token>\n\nBase: https://api.tyushop.blog/api/v1"))
story.append(body("API errors use a consistent JSON shape. Validation errors normally return HTTP 422; unauthenticated requests return 401; unauthorized role access returns 403; expired CSRF returns 419; server/dependency failures may return 500 or 503."))
story.append(code('{\n  "status": "error",\n  "message": "Human-readable description",\n  "errors": {"field": ["Validation detail"]}\n}'))
story.append(h2("Health and authentication endpoints"))
story.append(table(
    ["Method", "Endpoint", "Auth", "Purpose"],
    [
        ["GET", "/health", "Public", "Basic API health"],
        ["GET", "/health/ready", "Public", "Database, Redis and storage readiness"],
        ["GET", "/sanctum/csrf-cookie", "Cookie", "Initialize XSRF-TOKEN before mutations"],
        ["POST", "/auth/register", "Public", "Register customer; default CUSTOMER role"],
        ["POST", "/auth/login", "Public", "Email/password login with rate limit"],
        ["POST", "/auth/forgot-password", "Public", "Send password reset OTP"],
        ["POST", "/auth/verify-otp", "Public", "Verify six-digit OTP"],
        ["POST", "/auth/reset-password", "Public", "Reset password"],
        ["GET", "/auth/google/redirect", "Public", "Start Google OAuth redirect"],
        ["GET", "/auth/google/callback", "Public", "Complete Socialite callback"],
        ["POST", "/auth/google/firebase", "Public", "Exchange Firebase Google ID token"],
        ["GET", "/auth/me", "Sanctum", "Return current user and roles"],
        ["PUT/POST", "/auth/profile", "Sanctum", "Update profile"],
        ["PUT", "/auth/password", "Sanctum", "Change password"],
        ["POST", "/auth/logout", "Sanctum", "Revoke current token/session"],
        ["POST", "/auth/logout-all", "Sanctum", "Revoke all devices"],
    ], [19 * mm, 59 * mm, 25 * mm, 63 * mm]
))
story.append(h2("Example login"))
story.append(code('{\n  "email": "customer@example.com",\n  "password": "********",\n  "remember": true\n}'))
story.append(PageBreak())

# Catalog / commerce APIs
story.append(h1("6. API reference: catalog, inventory, and commerce"))
story.append(h2("Public catalog and media"))
story.append(table(
    ["Method", "Endpoint", "Purpose"],
    [
        ["GET", "/store-settings", "Public language, currency, loyalty and store settings"],
        ["GET", "/banners, /banners/{id}", "Read active banners"],
        ["POST", "/banners/{id}/click", "Record banner click"],
        ["GET", "/media/{path}", "Stream or proxy media"],
        ["GET", "/categories", "/categories/{id}"],
        ["GET", "/categories/{id}/attributes", "Dynamic specification attributes"],
        ["GET", "/brands", "/brands/{id}"],
        ["GET", "/products", "/products/{id or slug}"],
        ["GET", "/inventory", "/inventory/{product}/movements"],
    ], [28 * mm, 72 * mm, 66 * mm]
))
story.append(h2("Catalog and inventory mutations"))
story.append(table(
    ["Method", "Endpoint", "Typical authorization"],
    [
        ["POST", "/products", "Sanctum; admin or seller service rules"],
        ["PATCH", "/products/{product}", "Sanctum; owner/admin rules"],
        ["DELETE", "/products/{product}", "Sanctum; owner/admin rules"],
        ["POST", "/inventory/{product}/adjust", "Sanctum; inventory/admin rules"],
        ["POST", "/admin/categories", "Admin"],
        ["PATCH/DELETE", "/admin/categories/{category}", "Admin"],
        ["POST", "/admin/categories/{category}/attributes", "Admin"],
        ["PATCH/DELETE", "/admin/category-attributes/{attribute}", "Admin"],
        ["POST", "/admin/brands", "Admin"],
        ["PATCH/DELETE", "/admin/brands/{brand}", "Admin"],
    ], [28 * mm, 78 * mm, 60 * mm]
))
story.append(PageBreak())
story.append(h2("Customer commerce endpoints"))
story.append(table(
    ["Method", "Endpoint", "Purpose"],
    [
        ["GET", "/coupons", "List public coupon metadata"],
        ["POST", "/coupons/validate", "Validate coupon against cart"],
        ["GET", "/loyalty/summary", "Read points balance and eligible rewards"],
        ["POST", "/loyalty/redeem-free-item", "Redeem 100-point reward"],
        ["POST", "/orders/checkout", "Create order and optionally generate KHQR"],
        ["GET", "/orders/track/{orderNumber}", "Read order and payment status"],
        ["POST", "/orders/track/{orderNumber}/confirm-payment", "Verify Bakong payment or authorized COD handover"],
        ["GET", "/wishlist", "Read wishlist"],
        ["POST", "/wishlist/toggle", "Add/remove favorite"],
        ["POST", "/support/tickets", "Create support ticket"],
        ["POST", "/support/chat", "Customer support chat"],
    ], [28 * mm, 82 * mm, 56 * mm]
))
story.append(h2("Checkout request example"))
story.append(code('{\n  "items": [{"product_id": 7, "name": "USB-C Cable", "price": 14.50, "quantity": 1}],\n  "customer_name": "Roeun Vathana",\n  "customer_phone": "+85516555637",\n  "customer_email": "customer@example.com",\n  "delivery_address": "Phnom Penh, Cambodia",\n  "payment_method": "bakong_khqr",\n  "initiate_qr": true,\n  "delivery_method_id": "standard-express",\n  "idempotency_key": "checkout-unique-001"\n}'))
story.append(PageBreak())

# Exact insert/update key reference
story.append(h1("API insert/update keys: route and body detail"))
story.append(body("This section is a practical reference for frontend, Postman, and integration work. Use the Base URL and endpoint below, then send JSON using the listed keys. Keys marked Required must be present on insert; updates normally use PATCH and send only the fields being changed. Read response.errors for the exact validation failure."))
story.append(h2("1) Authentication and user insert/update"))
story.append(table(
    ["Method + route", "Required body keys", "Optional / notes"],
    [
        ["POST /auth/register", "name, email, password", "phone_number; password must be at least 8 chars with mixed case and number. Returns 201 plus data.token."],
        ["POST /auth/login", "email, password", "remember; returns 200 plus data.token and data.user."],
        ["PUT/POST /auth/profile", "name, email", "phone_number, avatar_url, address; current_password is required when new_password is sent; new_password is optional."],
        ["POST /auth/google/firebase", "id_token", "email, name, avatar, uid; id_token must be a valid Firebase Google token."],
        ["POST /auth/verify-otp", "email, otp", "otp is exactly 6 characters; response gives reset_token."],
        ["POST /auth/reset-password", "email, reset_token, password", "Password must satisfy the same strong-password rule."],
        ["POST /admin/security/users", "name, email", "phone_number, password, status, role. status: active / inactive / pending / suspended. Admin only."],
        ["PATCH /admin/security/users/{user}", "name, email, status", "phone_number. status also allows on_leave."],
        ["PATCH /admin/security/users/{user}/email", "email", "mark_verified boolean; admin only."],
        ["PATCH /admin/security/users/{user}/password", "password", "revoke_tokens boolean; strong password required."],
    ], [42 * mm, 53 * mm, 63 * mm]
))
story.append(h2("2) Product insert/update: exact keys"))
story.append(table(
    ["Route", "Required on insert", "Optional keys accepted"],
    [
        ["POST /products", "name, sku, selling_price", "brand, brand_id, product_type (simple / variable / digital / bundle), description, cost_price, discount_price, currency, category_id, category_ids[], initial_stock, stock_quantity, low_stock_threshold, weight, dimensions{}, status, is_active, is_featured, is_new_arrival, is_best_seller, is_flash_sale, image_url, gallery_urls[], specifications{}, attributes[], variants[]"],
        ["PATCH /products/{product}", "name/sku/selling_price only when those fields are included", "Same product fields except initial_stock and stock_quantity are insert-oriented; SKU must remain unique. variants[].sku/name are required when variants are submitted."],
        ["POST /inventory/{product}/adjust", "delta", "reason, type (adjustment / restock / damage / correction); delta cannot be zero."],
    ], [42 * mm, 52 * mm, 64 * mm]
))
story.append(code('{\n  "name": "USB-C Fast Charging Cable",\n  "sku": "CABLE-100W-001",\n  "selling_price": 14.50,\n  "currency": "USD",\n  "product_type": "simple",\n  "category_id": 3,\n  "brand_id": 2,\n  "initial_stock": 50,\n  "low_stock_threshold": 5,\n  "image_url": "https://cdn.example.com/cable.jpg",\n  "gallery_urls": ["https://cdn.example.com/cable-2.jpg"],\n  "specifications": {"power": "100W", "length": "1m"},\n  "is_active": true\n}'))
story.append(h2("3) Category and brand insert/update"))
story.append(table(
    ["Route", "Required", "Optional / nested keys"],
    [
        ["POST /categories", "name", "slug, parent_id, icon, image_url, description, sort_order, is_active, seo_title, seo_description, seo_keywords."],
        ["PATCH /categories/{category}", "name or slug if included", "Same category keys; PATCH is partial and slug must remain unique."],
        ["POST /categories/{category}/attributes", "See dynamic attribute schema", "Use category attribute endpoint for category-specific fields; inspect GET /categories/{category}/attributes before insert."],
        ["POST /brands", "name", "slug, logo_url, description, country, website, status (active / inactive / archived), is_active, sort_order, seo_title, seo_description, seo_keywords, translations[].{locale,name,description}."],
        ["PATCH /brands/{brand}", "name or slug if included", "Same brand keys; translations locale is en or km."],
    ], [48 * mm, 42 * mm, 68 * mm]
))
story.append(PageBreak())

story.append(h2("4) Commerce insert/update keys"))
story.append(table(
    ["Method + route", "Required keys", "Optional keys / enum"],
    [
        ["POST /orders/checkout", "items[], customer_name, customer_phone, delivery_address", "items[].product_id/name/price/quantity; customer_email, coupon_code, idempotency_key, redeem_free_product_id, dest_lat, dest_lng, payment_method (bakong_khqr / cash_on_delivery), initiate_qr, notes, delivery_method_id."],
        ["POST /coupons", "code, discount_type, discount_value", "description, min_order_amount, max_discount_amount, is_active, expires_at. discount_type: percentage / fixed; code allows A-Z, 0-9, _ and -."],
        ["PATCH /coupons/{id}", "Only fields being changed", "Same coupon keys; percentage discount_value cannot exceed 100."],
        ["POST /coupons/validate", "code, subtotal", "subtotal is the cart subtotal; response determines whether discount is usable."],
        ["POST /wishlist/toggle", "product_id", "Authenticated customer; toggles the product instead of creating duplicate rows."],
        ["POST /support/tickets", "name, email, subject, message", "category and order_number are optional; response returns a 201 ticket_number."],
    ], [43 * mm, 50 * mm, 65 * mm]
))
story.append(h2("Checkout keys that prevent ‘given data was invalid’"))
story.append(body("The checkout validator requires items to be a non-empty array. Every item needs product_id, name, price and quantity. customer_name, customer_phone and delivery_address are required. If the UI selects KHQR, send payment_method=bakong_khqr and initiate_qr=true. Keep the same idempotency_key when retrying a timed-out checkout so the server does not create a duplicate order."))
story.append(code('POST /api/v1/orders/checkout\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{"items":[{"product_id":7,"name":"USB-C Cable","price":14.50,"quantity":1}],"customer_name":"Roeun Vathana","customer_phone":"+85516555637","delivery_address":"BKK1, Phnom Penh","payment_method":"bakong_khqr","initiate_qr":true,"delivery_method_id":"standard-express","idempotency_key":"checkout-20261113-001"}'))
story.append(h2("5) Payment account and store/Bakong settings"))
story.append(table(
    ["Route", "Body keys", "Important behavior"],
    [
        ["POST /payment-accounts", "bank_name, account_id, merchant_name, merchant_city, currency", "account_type=bakong; merchant_phone, is_active, is_default optional. account_id must look like name@suffix and currency is USD / KHR / BOTH."],
        ["PATCH /payment-accounts/{account}", "Only fields being changed", "Same account keys; account mutation allowed for admin or approved seller/seller staff according to ownership."],
        ["POST /payment-accounts/{account}/default", "No body", "Makes the selected merchant/payout account default."],
        ["PATCH /admin/store-settings", "No single required key", "Partial update. Common Bakong keys: bakong_account_id, bakong_merchant_name, merchant_phone, bakong_api_url, bakong_api_enabled, bakong_api_token, bakong_api_token_clear."],
        ["POST /store-settings/currency", "No single required key", "default_currency (USD / KHR), usd_to_khr_rate, allowed_currencies and other store settings."],
    ], [45 * mm, 59 * mm, 54 * mm]
))
story.append(code('{\n  "bakong_account_id": "roeun_vathana1@bkrt",\n  "bakong_merchant_name": "TYUSHOP",\n  "merchant_phone": "855976554143",\n  "bakong_api_url": "https://api-bakong.nbc.gov.kh",\n  "bakong_api_enabled": true,\n  "bakong_api_token": "<server-secret>"\n}'))
story.append(body("Never put BAKONG_API_TOKEN in frontend JavaScript, a public PDF, a screenshot or a client request. Store it server-side or use the masked/admin settings flow. The checkout QR is generated from the active account and server configuration; changing a client-only account value cannot make payment verification succeed."))
story.append(PageBreak())

story.append(h2("6) Admin CRUD, roles, banners and delivery keys"))
story.append(table(
    ["Route", "Insert/update keys", "Notes"],
    [
        ["PATCH /admin/orders/{id}", "customer_name, customer_phone, delivery_address", "customer_email and notes optional."],
        ["PATCH /admin/orders/{id}/status", "status", "Allowed: pending / processing / shipped / delivered / cancelled; driver_name, driver_phone, estimated_arrival, notes optional."],
        ["PATCH /admin/orders/{id}/payment-status", "payment_status", "Allowed: pending / completed / paid / failed; updates related payment record."],
        ["POST /admin/banners", "title", "subtitle, badge_text, image_url, video_url, link_url, button_text, background_style, placement (hero / promo / category / sidebar), sort_order, is_active, start_at, end_at."],
        ["PATCH /admin/banners/{banner}", "Only changed fields", "Same banner keys; POST /admin/banners/reorder uses items[].id and items[].sort_order."],
        ["POST /admin/delivery/methods", "name, price", "name_km, estimated_time, estimated_time_km, is_active, is_default optional."],
        ["PATCH /admin/delivery/methods/{id}", "Only changed fields", "Same delivery method keys."],
        ["POST /admin/delivery/settings", "is_free_delivery", "free_delivery_threshold and default_delivery_fee optional."],
        ["POST/PUT/PATCH /admin/users/{user}/roles", "One role selector", "Use role_ids[], role_slugs[], roles[], or single role. SUPER_ADMIN is required for root/admin escalation."],
        ["POST /admin/api-tokens", "name", "user_id, abilities[], expires_in_days optional (1-365). Token is shown once; store it securely."],
    ], [51 * mm, 67 * mm, 40 * mm]
))
story.append(h2("7) Seller application insert/update"))
story.append(table(
    ["Route", "Required keys", "Optional keys"],
    [
        ["POST /sellers/apply", "store_name, phone", "category, description, telegram_username, city, address, bank_name, bakong_account_id, logo_url, banner_url. If unauthenticated, email/name/password are also required to create the account."],
        ["PATCH /admin/sellers/{id}", "store_name, phone", "Same seller store and settlement fields."],
        ["PATCH /admin/sellers/{id}/status", "status", "pending / approved / rejected / suspended."],
        ["POST /admin/sellers/{id}/reject", "reason", "Admin rejection reason, max 1000 chars."],
    ], [48 * mm, 53 * mm, 57 * mm]
))
story.append(h2("Path parameters, query parameters and response handling"))
story.append(table(
    ["Location", "Example", "Rule"],
    [
        ["Path parameter", "/products/{product}, /orders/track/{orderNumber}", "Replace braces with the actual numeric ID, slug or order number; do not send braces literally."],
        ["Query parameter", "/products?page=1&per_page=20&search=cable", "Use query parameters for filtering/pagination; keep JSON body for insert/update."],
        ["JSON body", "{\"selling_price\":14.50}", "Content-Type must be application/json. PATCH accepts a partial object unless a field is explicitly required when present."],
        ["Multipart body", "POST /auth/avatar", "Use FormData with key avatar; do not JSON-encode the file."],
        ["Success", "200 / 201 / 204", "Read status/data/message; create routes commonly return 201, updates commonly return 200."],
        ["Validation failure", "422", "Read errors.field[]; fix the named key before retrying."],
    ], [40 * mm, 57 * mm, 61 * mm]
))
story.append(PageBreak())

# Admin APIs
story.append(h1("7. API reference: admin, seller, delivery, and Telegram"))
story.append(h2("Admin overview and CRUD"))
story.append(table(
    ["Group", "Endpoints", "Scope"],
    [
        ["Overview", "GET /admin/stats, /admin/overview", "Dashboard KPIs"],
        ["Orders", "GET /admin/orders, /admin/orders/{id}", "List and inspect orders"],
        ["Order CRUD", "PATCH /admin/orders/{id}; PATCH status/payment-status; DELETE", "Update fulfillment and payment state"],
        ["Users", "GET /admin/users; GET /admin/security/users", "Directory and security records"],
        ["Roles", "GET /admin/roles; GET /admin/permissions; GET /admin/staff", "Role and permission catalog"],
        ["Assign roles", "POST/PUT/PATCH /admin/users/{user}/roles", "Set role IDs/slugs and optional permissions"],
        ["Seller governance", "GET/PATCH/DELETE /admin/sellers/{id}; approve/reject/status", "Review and manage seller applications"],
        ["Banners", "GET/POST/PATCH/DELETE /admin/banners", "CRUD, toggle and reorder banners"],
        ["Tokens", "GET/POST/DELETE /admin/api-tokens; regenerate", "Personal access token governance"],
        ["Settings", "GET/PATCH /admin/store-settings", "Global store and Bakong settings"],
        ["Security", "/admin/security/users, /otps, /email-settings, /telegram-settings", "Users, OTP, SMTP and Telegram"],
        ["Delivery rates", "/admin/delivery/settings, /methods, /toggle-free", "Shipping methods and prices"],
        ["Maintenance", "POST /admin/database/seed; POST /admin/database/clear-application-data", "Seed or protected destructive cleanup"],
    ], [34 * mm, 83 * mm, 49 * mm]
))
story.append(h2("Payment account endpoints"))
story.append(table(
    ["Method", "Endpoint", "Behavior"],
    [
        ["GET", "/payment-accounts", "Admin accounts plus seller-owned payout accounts visible to caller"],
        ["POST", "/payment-accounts", "Create a Bakong payout account"],
        ["PATCH", "/payment-accounts/{account}", "Update account ID, name and default state"],
        ["DELETE", "/payment-accounts/{account}", "Remove account if authorization allows"],
        ["POST", "/payment-accounts/{account}/default", "Select default merchant/payout account"],
    ], [25 * mm, 69 * mm, 72 * mm]))
story.append(PageBreak())
story.append(h2("Delivery and operations"))
story.append(table(
    ["Method", "Endpoint", "Purpose"],
    [
        ["GET", "/delivery/orders", "Delivery queue"],
        ["PATCH", "/delivery/orders/{orderNumber}/location", "Update delivery location"],
        ["POST", "/delivery/orders/{orderNumber}/status", "Update transit status"],
        ["POST", "/delivery/broadcast-gps", "Broadcast driver GPS"],
        ["GET", "/operations/overview", "Staff operations overview"],
        ["GET", "/operations/drivers", "List drivers"],
        ["POST", "/operations/orders/{orderNumber}/assign-driver", "Assign driver"],
        ["GET", "/seller/dashboard", "Seller reporting"],
    ], [25 * mm, 82 * mm, 59 * mm]
))
story.append(h2("Telegram Mini App and bot"))
story.append(table(
    ["Method", "Endpoint", "Purpose"],
    [
        ["POST", "/telegram/webhook", "Telegram bot webhook receiver"],
        ["POST", "/telegram/auth", "HMAC-authenticated Mini App login"],
        ["GET", "/telegram/products, /categories", "Mini App catalog"],
        ["POST", "/telegram/ai/chat", "AI shopping assistant"],
        ["GET", "/telegram/ai/history/{sessionId}", "AI chat history"],
        ["GET", "/telegram/profile", "Authenticated Mini App profile"],
        ["GET/POST", "/telegram/admin/stock, /stock-adjust, /sales-summary", "Admin Mini App operations"],
    ], [25 * mm, 82 * mm, 59 * mm]
))
story.append(PageBreak())

# Payment flow
story.append(h1("8. Payment flow: Bakong KHQR and COD"))
story.append(h2("Bakong KHQR sequence"))
story.append(table(
    ["Step", "Frontend", "Backend / gateway"],
    [
        ["1. Select", "CartPage selects Bakong KHQR and delivery method.", "Checkout validates customer, items, payment method and stock."],
        ["2. Create", "POST /orders/checkout with initiate_qr=true.", "Creates order/payment and generates a KHQR string plus MD5."],
        ["3. Display", "QR modal renders the returned QR string and expiry.", "Merchant account and merchant name come from seller/admin settings and secure config."],
        ["4. Scan", "Customer scans in Bakong, ABA, ACLEDA, Wing or another supported app.", "NBC Bakong records the transaction."],
        ["5. Verify", "Frontend calls confirm-payment after scan or polling action.", "Backend calls /v1/check_transaction_by_md5 and checks response code, amount, currency and merchant ID."],
        ["6. Complete", "Frontend shows success and clears the cart.", "Order/payment becomes paid; receipt and loyalty processing run once."],
    ], [20 * mm, 67 * mm, 77 * mm]
))
story.append(h2("Bakong verification prerequisites"))
for line in [
    "BAKONG_API_ENABLED must be true and the server must have a valid BAKONG_API_TOKEN.",
    "BAKONG_API_URL should be https://api-bakong.nbc.gov.kh without escaped backslashes in the saved value.",
    "BAKONG_ACCOUNT_ID must be a valid Bakong merchant ID with a bank suffix, for example a supported @abaa, @aclb, @wing, @cani or @bakong suffix.",
    "The QR must not be expired; the default QR expiry is controlled by PAYMENT_QR_EXPIRES_MINUTES.",
    "Verification must match the exact merchant account, amount and currency. A mismatch correctly returns a failed/unverified payment.",
    "A missing QR string or MD5 means the checkout must be recreated rather than manually forcing a paid status.",
]:
    story.append(bullet(esc(line)))
story.append(h2("COD sequence"))
story.append(body("Cash-on-delivery orders are not self-confirmed by a customer. A delivery operator or authorized admin confirms the handover from the delivery workflow. This prevents a customer from marking an unpaid COD order as paid."))
story.append(h2("Payment failure interpretation"))
story.append(table(
    ["Message / status", "Meaning", "Action"],
    [
        ["No response from API", "API edge, backend cold start, network or timeout", "Check /health, logs, API base URL and retry with same idempotency key"],
        ["Given data was invalid", "Payload validation failed", "Inspect 422 errors and verify required fields"],
        ["Bakong verification unavailable", "Token/API disabled or NBC request failed", "Check token, URL, enabled flag and server egress"],
        ["QR expired", "Payment window ended", "Create a new checkout and scan the new QR"],
        ["Transaction false/unverified", "MD5 transaction did not match expected payment", "Do not mark paid; verify merchant, amount and currency"],
    ], [40 * mm, 64 * mm, 60 * mm]
))
story.append(PageBreak())

# Roles
story.append(h1("9. Roles: detailed explanation of each role"))
story.append(body("A role is a group of permissions. A permission is a specific action such as products.create or orders.update. A user can have multiple roles, and the resulting access can be adjusted through role_permissions."))
role_rows = [
    ["SUPER_ADMIN", "System root", "Controls the entire platform, users, roles, permissions, settings, and administrator governance."],
    ["ADMIN", "Platform administration", "Manages products, orders, sellers, users, settings, and disputes. Normally cannot grant root access or manage permissions."],
    ["STAFF", "General operations", "Performs daily dashboard operations; actual access depends on permissions granted by an administrator."],
    ["PRODUCT_MANAGER", "Catalog", "Manages products, categories, brands, variants, and pricing."],
    ["ORDER_MANAGER", "Order lifecycle", "Manages order status, cancellation, fulfillment, and the customer order queue."],
    ["INVENTORY_MANAGER", "Stock control", "Views and adjusts stock, transfers inventory, approves write-offs, and monitors thresholds."],
    ["WAREHOUSE_MANAGER", "Warehouse", "Manages warehouse receiving, bins/locations, and stock levels."],
    ["FINANCE_MANAGER", "Finance", "Manages expenses, budgets, payouts, and financial policy."],
    ["ACCOUNTANT", "Accounting", "Creates and posts journals, performs bank reconciliation, and prepares financial reports."],
    ["PURCHASING_MANAGER", "Purchasing", "Manages suppliers, quotations, purchase orders, and matching."],
    ["CUSTOMER_SUPPORT", "Support", "Handles inquiries, tickets, disputes, and customer assistance."],
    ["LOGISTICS_MANAGER", "Logistics", "Manages the delivery fleet, routes, performance, and driver assignment."],
    ["DISPATCHER", "Dispatch", "Assigns parcels to drivers and monitors transit."],
    ["DELIVERY_DRIVER", "Courier", "Receives and delivers orders, sends GPS updates, changes status, and confirms drop-off."],
    ["SELLER", "Merchant", "Owns a multi-vendor store and manages products, stock, seller orders, and the payout account."],
    ["SELLER_STAFF", "Seller assistant", "Assists a seller with store operations using the role and permissions assigned to the staff account."],
    ["CUSTOMER", "Buyer", "Browses products, manages the cart, checks out, pays, saves favorites, earns loyalty points, and tracks orders."],
]
story.append(table(["Role", "Area", "Detailed responsibility"], role_rows, [36 * mm, 38 * mm, 90 * mm]))
story.append(PageBreak())

# Access matrix / permissions
story.append(h1("10. Role access matrix and permission model"))
story.append(h2("Frontend access matrix"))
story.append(table(
    ["Area", "SUPER_ADMIN / ADMIN", "Seller", "Staff / Ops", "Delivery", "Warehouse", "Customer"],
    [
        ["Storefront browsing", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes"],
        ["Product create/edit", "Yes", "Yes, owner rules", "Only if assigned", "No", "No", "No"],
        ["Inventory dashboard", "Yes", "Seller stock views", "If assigned", "No", "Yes", "No"],
        ["Orders management", "Yes", "Seller orders", "If assigned", "Assigned orders", "No", "Own orders"],
        ["Seller approval", "Yes", "No", "No", "No", "No", "No"],
        ["Roles and permissions", "Yes; root restrictions apply", "No", "No", "No", "No", "No"],
        ["Delivery dispatch", "Yes", "No", "Operations only", "Own route", "No", "Track own order"],
        ["Global settings/Bakong", "Yes", "Own payout account", "No", "No", "No", "View payment option"],
    ], [31 * mm, 27 * mm, 27 * mm, 27 * mm, 27 * mm, 27 * mm, 27 * mm]
))
story.append(h2("Permission groups seeded in RoleSeeder"))
story.append(table(
    ["Group", "Permissions"],
    [
        ["products", "products.view, products.create, products.update, products.delete"],
        ["orders", "orders.view, orders.update"],
        ["payments", "payments.view, payments.refund.approve"],
        ["inventory", "inventory.view, inventory.adjust, inventory.transfer, inventory.approve"],
        ["purchasing", "suppliers.manage, purchases.create, purchases.approve"],
        ["expenses", "expenses.create, expenses.approve"],
        ["accounting", "accounting.view, accounting.journals.create, accounting.journals.post, accounting.reports.view, banking.reconcile"],
        ["logistics", "delivery.assign, delivery.update, delivery.tracking.view"],
        ["administration", "staff.manage, roles.manage, permissions.grant, settings.manage"],
    ], [35 * mm, 131 * mm]
))
story.append(h2("Role assignment rules"))
for line in [
    "Only SUPER_ADMIN or ADMIN can open role-management API endpoints.",
    "An ADMIN cannot modify its own roles.",
    "Only SUPER_ADMIN may grant ADMIN or SUPER_ADMIN roles.",
    "Only SUPER_ADMIN may grant permission-management access (permissions.grant).",
    "Seller approval assigns SELLER to the applicant; a seller application normally starts from a customer account.",
    "New email/Google users are normally assigned CUSTOMER by the authentication flow.",
]:
    story.append(bullet(esc(line)))
story.append(PageBreak())

# Admin workflows and maintenance
story.append(h1("11. Admin dashboard workflows"))
story.append(table(
    ["Workflow", "Typical steps", "Important safeguards"],
    [
        ["Create product", "Open /admin/products/create -> validate title/SKU/category/price -> upload media -> save -> inventory", "Price must be numeric; backend validation is authoritative."],
        ["Edit/delete product", "Open list -> edit or delete -> confirm dialog -> API mutation -> refresh list", "Seller ownership rules and server authorization still apply."],
        ["Manage order", "Open /admin/orders -> inspect -> update status/payment -> receipt/resend if needed", "Payment status should only be changed through authorized workflow."],
        ["Approve seller", "Review application -> verify business and Bakong details -> approve/reject -> role upgrade", "Do not approve invalid merchant account or incomplete verification."],
        ["Configure Bakong", "Admin settings -> API URL/token/enabled/account ID/name/city -> save -> test checkout", "Never expose the full API token in UI or logs."],
        ["Assign role", "Users -> Assign Role -> choose role/permissions -> save -> user refreshes session", "SUPER_ADMIN is required for protected role escalation."],
        ["Clear production data", "Admin Security -> Production Data Maintenance -> confirm", "Deletes application rows but preserves tables, admin, roles, permissions, settings and global Bakong."],
    ], [35 * mm, 73 * mm, 58 * mm]
))
story.append(h2("Protected application-data cleanup"))
story.append(code("POST /api/v1/admin/database/clear-application-data\nBody: {\"confirmation\": \"CLEAR_ALL_APPLICATION_DATA\"}\n\nPreserved: tables/schema, admin users, role and permission records,\nstore settings, global Bakong configuration, admin sessions/tokens.\nDeleted: products, customers, orders, sellers, activity and dependent rows."))
story.append(body("The endpoint is transactional. If a database exception occurs, the transaction rolls back and the admin receives an error rather than a partial cleanup. The UI requires a confirmation dialog before the request is sent."))
story.append(PageBreak())

# Troubleshooting and security
story.append(h1("12. Security, performance, and troubleshooting"))
story.append(h2("Common problems and fixes"))
story.append(table(
    ["Symptom", "Likely cause", "Check / fix"],
    [
        ["Page redirects to login", "Missing/expired token or 401", "Call /auth/me, clear stale local session, sign in again; inspect redirect query."],
        ["Google login succeeds but does not return home", "Firebase callback/session save or route redirect", "Check /auth/google/firebase response includes user/token and inspect browser console/network."],
        ["OTP not received", "SMTP or OTP settings unavailable", "Admin Security -> Email/OTP settings; check mail logs and throttling."],
        ["Checkout says no API response", "Custom API edge timeout or backend cold start", "Check /health, direct Railway API, deployment logs; preserve idempotency key on retry."],
        ["Given data was invalid", "422 validation error", "Read response.errors; ensure customer fields, item IDs, payment_method and delivery address are present."],
        ["QR shows no code", "Checkout response has no qr_string", "Check Bakong enabled/token/account ID, amount > 0, and API response payload."],
        ["QR scans but payment is unverified", "MD5, amount, currency or merchant mismatch", "Verify BAKONG_ACCOUNT_ID and currency; do not force paid status."],
        ["API is slow", "Cold start, uncached query or custom-domain edge latency", "Use readiness health, query caching, indexes, direct public catalog base and request timing."],
        ["Admin page is inaccessible", "Role missing or stale user profile", "Refresh /auth/me after role assignment; verify SUPER_ADMIN/ADMIN role pivot."],
    ], [40 * mm, 58 * mm, 68 * mm]
))
story.append(h2("Security checklist"))
for line in [
    "Keep BAKONG_API_TOKEN, SMTP password, Google credentials and Telegram bot token only in server environment/secrets.",
    "Use HTTPS for storefront, API, OAuth callback and Sanctum cookies.",
    "Keep rate limits on login, registration, OTP, checkout, tracking, coupon and support endpoints.",
    "Do not log full payment tokens or full access tokens; the admin UI displays masked values.",
    "Use server-side authorization even when the frontend hides a button. UI guards are for user experience, not security boundaries.",
    "Use an idempotency key for checkout retries and keep the same key until the original request outcome is known.",
]:
    story.append(bullet(esc(line)))
story.append(h2("Verification commands"))
story.append(code("curl -i https://api.tyushop.blog/api/v1/health\ncurl -i https://api.tyushop.blog/api/v1/health/ready\n\n# Frontend build\ncd frontend\nnpm run build\n\n# Backend tests\ncd backend\nphp artisan test"))
story.append(PageBreak())

# Source map and appendix
story.append(h1("13. Source map and reference files"))
story.append(table(
    ["File", "Why it matters"],
    [
        ["backend/routes/api.php", "Canonical v1 endpoint registry and middleware grouping."],
        ["backend/app/Http/Controllers/Api/V1/AuthController.php", "Registration, login, Google, OTP and profile operations."],
        ["backend/app/Http/Controllers/Api/V1/CommerceEngagementController.php", "Checkout, QR creation, payment verification, loyalty, wishlist and support."],
        ["backend/app/Http/Controllers/Api/V1/Admin/RolePermissionController.php", "Role list, permissions, staff list and role assignment restrictions."],
        ["backend/database/seeders/RoleSeeder.php", "Enterprise role catalog and permission matrix."],
        ["backend/app/Http/Controllers/Api/V1/MerchantPaymentAccountController.php", "Admin/seller Bakong payout account CRUD."],
        ["backend/app/Http/Controllers/Api/V1/Admin/AdminMaintenanceController.php", "Seed-all and protected application-data cleanup."],
        ["frontend/src/App.tsx", "All React routes, lazy imports and route guard placement."],
        ["frontend/src/components/auth/AdminOnlyRoute.tsx", "Frontend access guards and role checks."],
        ["frontend/src/lib/api.ts", "Axios clients, base URLs, CSRF, bearer token, retry and error normalization."],
        ["frontend/src/context/ShopEngagementContext.tsx", "Cart, favorites, loyalty, language, currency and persistent browser state."],
        ["frontend/src/pages/storefront/CartPage.tsx", "Checkout UI, QR modal, payment confirmation and cart clearing."],
        ["frontend/src/pages/admin/AdminSecurityPage.tsx", "Security settings, token management and data-maintenance confirmation UI."],
        ["docs/api.md and docs/architecture.md", "Project-level overview; this PDF reflects the current route implementation where it differs from Phase 1 notes."],
    ], [80 * mm, 86 * mm]
))
story.append(h2("Implementation compatibility note"))
story.append(body("RoleSeeder.php defines 17 enterprise roles, including FINANCE_MANAGER, ACCOUNTANT and PURCHASING_MANAGER. RolePermissionController::ensureDefaultRoles() ensures the core operational set used by the admin API but does not recreate those three finance/purchasing roles if they are missing. The frontend also recognizes legacy aliases such as COURIER, OPERATIONS_MANAGER and MANAGER; they are compatibility checks and are not all standard seeded roles."))
story.append(PageBreak())
story.append(h2("Recommended ownership model"))
story.append(table(
    ["Owner", "Primary responsibilities"],
    [
        ["SUPER_ADMIN", "Root security, role/permission governance, global settings and incident recovery"],
        ["ADMIN", "Daily platform operations, sellers, orders, catalog and support governance"],
        ["Product / Inventory", "Catalog quality, price, variants, stock accuracy and warehouse controls"],
        ["Finance / Accountant", "Payouts, payment reconciliation, refund and financial reporting"],
        ["Logistics / Delivery", "Dispatch, route status, GPS and proof of delivery"],
        ["Seller", "Own products, stock, seller orders and payout account"],
        ["Customer Support", "Customer communication, tickets and disputes"],
    ], [43 * mm, 123 * mm]
))
story.append(Spacer(1, 8))
story.append(p("End of document", styles["QuoteX"]))


doc = DocTemplate(
    str(OUT), pagesize=A4,
    leftMargin=17 * mm, rightMargin=17 * mm,
    topMargin=23 * mm, bottomMargin=19 * mm,
    title="TYUSHOP Technical Documentation - API, Frontend and Roles",
    author="Codex",
)
doc.build(story)
print(OUT)
