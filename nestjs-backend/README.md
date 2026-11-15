# MageShop NestJS backend

This directory contains the production API for MageShop. The application is
implemented in NestJS and reads and writes the shared PostgreSQL database
directly. Laravel is not part of the request path and is not required to run
the API.

## Local run

```powershell
Copy-Item .env.example .env
npm install
npm run typecheck
npm run build
npm start
```

The server listens on `http://localhost:8080` by default. Configure
`DATABASE_URL`, `PUBLIC_API_URL`, and the required integration credentials in
the environment before using protected features.

## Runtime architecture

- NestJS controllers expose the `/api/v1` API, health endpoints, media routes,
  authentication, catalog, checkout, payments, delivery, seller, and admin
  operations.
- PostgreSQL is the source of truth for users, roles, permissions, catalog,
  orders, inventory, settings, and payment records.
- S3-compatible object storage is used for uploaded media when
  `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET`, and the related
  endpoint/region settings are configured. Local storage is used only when S3
  is not configured.
- Bakong, Telegram, email, Google/Firebase, and DNS are external integrations
  configured through environment variables and/or the admin settings APIs.

## Authentication and roles

Authentication is compatible with the existing Sanctum token records, so
existing accounts can continue to sign in. Role checks are enforced in NestJS
for customer, seller, seller staff, delivery, product-management, admin, and
super-admin operations. Protected routes return `401` for missing credentials
and `403` when the authenticated role is not allowed.

## Maintenance safety

Application-data clearing preserves the admin account, roles, permissions,
store settings, and Bakong configuration. Remote seed maintenance is disabled
unless `ALLOW_REMOTE_SEEDING=true`; do not enable it casually in production.

## Verification

Build and smoke-test the API before deployment:

```powershell
npm run typecheck
npm run build
```

Then check `/up`, `/api/v1/health`, `/api/v1/health/ready`, representative
public catalog routes, protected-route authentication, media URLs, checkout,
and payment confirmation with staging credentials. Real Bakong QR settlement,
Google sign-in, OTP delivery, email delivery, and Telegram notifications still
require provider credentials and a real device/account test.
