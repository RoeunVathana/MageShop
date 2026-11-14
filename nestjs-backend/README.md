# MageShop NestJS migration

This directory is the first, safe phase of the Laravel-to-NestJS migration.
It is intentionally a compatibility gateway: Laravel remains the source of
truth, while NestJS accepts the same paths, headers, cookies, request bodies,
file uploads, and API responses and forwards them to the Laravel API.

## Why this is safe

- The existing Laravel service and production database are not changed.
- The React frontend does not need to change while the migration is tested.
- A failed NestJS deployment cannot corrupt orders, payments, roles, or files.
- The `/up` endpoint proves the NestJS process is alive; proxied API responses
  still come from the existing Laravel contract.

## Local run

```powershell
Copy-Item .env.example .env
npm install
npm run typecheck
npm run build
npm start
```

The gateway listens on `http://localhost:8080` and forwards requests to
`LARAVEL_API_ORIGIN`. Do not point production traffic at this service until
the contract test suite proves parity for authentication, catalog, checkout,
Bakong confirmation, delivery operations, admin CRUD, email, and uploads.

## Direct-module feature flags

`NEST_DIRECT_CATALOG=true` enables the NestJS PostgreSQL reader for public
categories, brands, and products when `DATABASE_URL` is configured. Authenticated
catalog requests remain on Laravel until NestJS role guards are enabled.

`NEST_DIRECT_CATALOG_ADMIN=true` enables the guarded NestJS category, category
attribute, and brand CRUD paths. It is disabled by default until role and
transaction parity is verified against production-shaped data.

`NEST_DIRECT_AUTH=true` enables the NestJS implementation of registration,
login, current-user lookup, profile/password updates, logout, and logout-all,
including the legacy `/api/v1/user` aliases. It uses the existing
`personal_access_tokens`, `users`, `roles`, and `permissions` tables, so users
do not need new accounts or new tokens. Google OAuth, Firebase sign-in, OTP
recovery, and avatar uploads continue through Laravel until their parity tests
are complete.

`NEST_DIRECT_ORDERS=true` enables the NestJS customer order list, tracking
reader, and pending/confirmed order cancellation routes. It remains disabled
by default until response and cancellation side-effect parity is verified.

`NEST_DIRECT_CHECKOUT=true` is reserved for a later parity-verified rollout.
The current NestJS checkout writer is intentionally disabled by default and
must not be enabled in production until Bakong verification, receipt PDF/email
delivery, Telegram reporting, seller merchant routing, stock locking, and
payment confirmation tests all pass against the shared database.

`NEST_DIRECT_DELIVERY_READS=true` and `NEST_DIRECT_OPERATIONS_READS=true` are
read-only migration flags for delivery queues, staff overview, and driver
lists. Delivery mutations and payment settlement remain on Laravel until
their role-transition, cash-handover, receipt, and notification parity tests
are complete.

`NEST_DIRECT_DELIVERY_MUTATIONS=true` and
`NEST_DIRECT_OPERATIONS_MUTATIONS=true` enable the NestJS GPS/status/driver
assignment writes. They remain disabled until COD settlement, loyalty points,
receipt delivery, and driver authorization are verified end to end.

`NEST_DIRECT_PAYMENT_CONFIRM=true` is also disabled by default. Its Bakong
confirmation path validates the exact merchant, currency, amount, expiry, and
transaction reuse before settling the shared order ledger, but it must remain
off until the Laravel receipt/PDF/email/Telegram delivery behavior is covered
by parity tests.

`NEST_DIRECT_PAYMENT_ACCOUNTS=true` enables the shared PostgreSQL merchant
account CRUD for admin global accounts and approved seller-owned accounts. It
is disabled by default until account-setting synchronization and seller payout
authorization are verified against production-shaped data.

`NEST_DIRECT_INVENTORY=true` enables the NestJS inventory reader and guarded
atomic stock-adjustment path. It is disabled by default until stock movement
history and inventory role parity are verified against production-shaped data.

`NEST_DIRECT_ADMIN_ORDERS=true` enables the guarded admin order list, details,
status/payment updates, deletion, and dashboard statistics. It remains off by
default until order notifications, receipts, delivery transitions, and payment
settlement side effects are covered by parity tests.

`NEST_DIRECT_ADMIN_SECURITY=true` enables guarded admin user CRUD, role/permission
reads, role assignment, and administrator password/email changes. OTP delivery,
SMTP settings, and security logs remain Laravel-backed until their external side
effects are covered by parity tests.

## Migration rule

The frontend API URL and PostgreSQL data remain unchanged during the rewrite.
NestJS modules replace proxy paths one domain at a time only after their
responses and side effects match Laravel. Laravel remains available as the
rollback target until the complete parity checklist passes.
