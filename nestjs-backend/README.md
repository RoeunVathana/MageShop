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

`NEST_DIRECT_AUTH=true` enables the NestJS implementation of registration,
login, current-user lookup, logout, and logout-all. It uses the existing
`personal_access_tokens`, `users`, `roles`, and `permissions` tables, so users
do not need new accounts or new tokens. All other auth flows continue through
Laravel until their parity tests are complete.

## Migration rule

The frontend API URL and PostgreSQL data remain unchanged during the rewrite.
NestJS modules replace proxy paths one domain at a time only after their
responses and side effects match Laravel. Laravel remains available as the
rollback target until the complete parity checklist passes.
