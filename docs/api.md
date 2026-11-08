# MegaCommerce API Specification (Phase 1)

## Base URL
- Production/Docker: `http://localhost:8000/api/v1`
- Development: `http://127.0.0.1:8000/api/v1`

## Standard Request Headers
```http
Accept: application/json
Content-Type: application/json
X-Requested-With: XMLHttpRequest
```

## Standard Error Response Structure
All error responses return structured JSON:
```json
{
  "status": "error",
  "message": "Human-readable description of error.",
  "errors": {
    "field_name": [
      "Validation detail message"
    ]
  }
}
```

## Endpoints

### 1. Basic Health Check
**`GET /api/v1/health`**

Response (`200 OK`):
```json
{
  "status": "ok",
  "application": "MegaCommerce API"
}
```

### 2. Dependency Readiness Check
**`GET /api/v1/health/ready`** (or `GET /api/v1/health?details=true`)

Response (`200 OK`):
```json
{
  "status": "ok",
  "application": "MegaCommerce API",
  "version": "1.0.0-phase1",
  "timestamp": "2026-11-08T04:08:38+00:00",
  "dependencies": {
    "database": {
      "driver": "pgsql",
      "status": "healthy",
      "latency_ms": 30.46,
      "error": null
    },
    "redis": {
      "status": "skipped_or_idle",
      "latency_ms": 0,
      "message": "Redis optional in phase 1 local fallback"
    },
    "storage": {
      "status": "healthy"
    }
  }
}
```

### 3. CSRF Cookie Initialization (Sanctum)
**`GET /sanctum/csrf-cookie`**

Initializes `XSRF-TOKEN` cookie required for stateful SPA authentication.

