# MegaCommerce — Phase 1: Project Foundation

MegaCommerce is an enterprise-scale multi-vendor e-commerce platform designed for high transaction volume, modular merchant storefronts, and cross-border payments. 

This repository contains the completed **Phase 1: Project Foundation**, establishing a clean, tested, and decoupled architecture between the Laravel backend and React TypeScript frontend.

---

## 1. Technology Stack

- **Backend:** Laravel 12 (PHP 8.2+) REST API under `/api/v1`
- **Database:** PostgreSQL 18 with relational indexes and Eloquent models
- **Cache & Message Broker:** Redis 7 / Predis
- **Real-Time WebSockets:** Laravel Reverb (configured)
- **Authentication:** Laravel Sanctum (configured with stateful CSRF cookies)
- **OAuth Scaffolding:** Laravel Socialite (configured for Google OAuth in Phase 2)
- **Frontend:** React 19 + TypeScript bundled with Vite
- **Styling:** Tailwind CSS v3 with custom design system tokens
- **Component Primitives:** Radix UI / shadcn/ui patterns
- **State & Data Fetching:** Zustand, TanStack Query v5, Axios
- **Form Validation:** React Hook Form + Zod schema validation
- **DevOps:** Docker Compose (Nginx, PHP-FPM, PostgreSQL, Redis, React Vite)

---

## 2. Directory Structure

```text
megacommerce/
├── backend/                  # Laravel 12 API Application
│   ├── app/
│   │   ├── Http/Controllers/Api/V1/   # API v1 Controllers (Health, Auth)
│   │   └── Models/                     # User, Role, Permission Eloquent models
│   ├── config/               # cors.php, sanctum.php, database.php
│   ├── database/
│   │   ├── migrations/       # users, roles, permissions, role_user, role_permissions
│   │   └── seeders/          # RoleSeeder (6 core roles)
│   ├── routes/
│   │   └── api.php           # API v1 routes
│   ├── tests/                # Automated feature tests
│   └── .env.example          # Environment template with placeholders
├── frontend/                 # React 19 + TypeScript (Vite)
│   ├── src/
│   │   ├── components/       # Storefront layout, UI primitives, Dashboard layout
│   │   ├── pages/            # Storefront, Auth, Dashboards, Diagnostics
│   │   ├── lib/              # Axios API client (api.ts) & utils
│   │   ├── services/         # Health & Auth API services
│   │   ├── types/            # TypeScript interfaces & API types
│   │   └── hooks/            # TanStack Query custom hooks (useHealth)
│   └── .env.example          # Frontend environment template
├── infrastructure/           # Docker & Server Configurations
│   ├── docker/
│   │   ├── php/Dockerfile            # PHP 8.2-FPM container with pgsql & redis
│   │   └── frontend/Dockerfile       # Node 20 development container
│   └── nginx/default.conf            # Nginx proxy configuration
├── docs/                     # Documentation
│   ├── architecture.md       # High-level architecture & roadmap
│   ├── database.md           # Database ER diagram & table specifications
│   └── api.md                # API endpoints & error formats
├── docker-compose.yml        # Orchestration for all 5 services
├── .gitignore                # Root gitignore
└── README.md                 # Project documentation & run guide
```

---

## 3. Prerequisites

### Local Development (Host Machine)
- **PHP:** `^8.2` with extensions `pdo_pgsql`, `pgsql`, `curl`, `mbstring`, `zip`, `xml`
- **Composer:** `^2.2`
- **Node.js:** `^20.0` or `^22.0`
- **npm:** `^10.0`
- **PostgreSQL:** `^16` or `^18`
- **Redis (Optional):** Local Redis server or Docker Redis container

### Docker Development
- **Docker Desktop:** `^24.0` (Linux engine / WSL2)
- **Docker Compose:** `v2+`

---

## 4. Quick Start (Local Development)

### 4.1 Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```
3. Update your database credentials in `backend/.env`:
   ```env
   DB_CONNECTION=pgsql
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_DATABASE=megacommerce
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   ```
4. Install dependencies:
   ```bash
   composer install
   ```
5. Generate application key:
   ```bash
   php artisan key:generate
   ```
6. Run PostgreSQL migrations and seed foundational roles:
   ```bash
   php artisan migrate --seed
   ```
7. Start the backend development server:
   ```bash
   php artisan serve --port=8000
   ```
   Backend API runs at: `http://127.0.0.1:8000`

---

### 4.2 Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```
3. Install frontend dependencies:
   ```bash
   npm install
   ```
4. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   Frontend storefront runs at: `http://localhost:3000`

---

## 5. Docker Compose Setup

Run the entire platform (PostgreSQL, Redis, PHP-FPM, Nginx, React) inside Docker:

1. Build and start containers in the background:
   ```bash
   docker compose up -d --build
   ```
2. Verify container health status:
   ```bash
   docker compose ps
   ```
3. Run database migrations inside the backend container:
   ```bash
   docker compose exec backend php artisan migrate --seed
   ```
4. Access endpoints:
   - **Frontend Storefront:** `http://localhost:3000`
   - **Backend API & Nginx:** `http://localhost:8000/api/v1/health`
   - **PostgreSQL:** `localhost:5432`
   - **Redis:** `localhost:6379`
5. Stop containers:
   ```bash
   docker compose down
   ```

---

## 6. Testing & Quality Verification

### 6.1 Backend Automated Tests (PHPUnit)
Run the automated test suite verifying health endpoints, database readiness, structured error handling, and role seeder constraints:
```bash
cd backend
php artisan test
```

### 6.2 Frontend Type Checking & Production Build
Run TypeScript compilation and Vite production bundling:
```bash
cd frontend
npm run build
```

---

## 7. Key Phase 1 Routes & Pages

### Storefront Pages
- **Home:** `http://localhost:3000/`
- **Product Catalog:** `http://localhost:3000/products`
- **Product Details:** `http://localhost:3000/products/apple-macbook-pro-m3`
- **Categories:** `http://localhost:3000/categories`
- **Brands:** `http://localhost:3000/brands`
- **Cart:** `http://localhost:3000/cart`
- **Wishlist:** `http://localhost:3000/wishlist`
- **About:** `http://localhost:3000/about`
- **Contact:** `http://localhost:3000/contact`
- **FAQ:** `http://localhost:3000/faq`

### Authentication Pages (React Hook Form + Zod)
- **Login:** `http://localhost:3000/login`
- **Register:** `http://localhost:3000/register`
- **Forgot Password:** `http://localhost:3000/forgot-password`
- **Verify 6-Digit OTP:** `http://localhost:3000/verify-otp`
- **Reset Password:** `http://localhost:3000/reset-password`

### Multi-Vendor Dashboard Shells
- **Customer Portal:** `http://localhost:3000/dashboard/customer`
- **Seller Merchant Hub:** `http://localhost:3000/dashboard/seller`
- **Admin Control Center:** `http://localhost:3000/dashboard/admin`
- **Staff Operations Desk:** `http://localhost:3000/dashboard/staff`
- **Delivery Fleet App:** `http://localhost:3000/dashboard/delivery`
- **Warehouse Fulfillment:** `http://localhost:3000/dashboard/warehouse`

### Live API Diagnostics
- **Diagnostics Console:** `http://localhost:3000/diagnostics`
  *Displays real-time backend connection status, PostgreSQL database driver and latency, and raw health telemetry.*

---

## 8. Common Troubleshooting

### 1. `CORS Policy Blocked`
Ensure `FRONTEND_URL=http://localhost:3000` is set in `backend/.env` and `SANCTUM_STATEFUL_DOMAINS=localhost:3000`.

### 2. `Database Connection Refused`
Ensure PostgreSQL service is active on port `5432` and database `megacommerce` exists. Check `DB_USERNAME` and `DB_PASSWORD` in `backend/.env`.

### 3. `Vite Port 3000 Conflict`
If port 3000 is occupied, adjust `FORWARD_FRONTEND_PORT` in `.env` or pass `--port <number>` to `npm run dev`.

