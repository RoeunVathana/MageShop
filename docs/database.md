# MegaCommerce Database Schema (Phase 1)

## 1. Relational ER Diagram

```mermaid
erDiagram
    users ||--o{ role_user : has
    roles ||--o{ role_user : assigned_to
    roles ||--o{ role_permissions : has
    permissions ||--o{ role_permissions : granted_to

    users {
        bigint id PK
        string name
        string email UK
        string phone_number UK
        timestamp email_verified_at
        timestamp phone_verified_at
        string password
        string status
        string remember_token
        timestamp created_at
        timestamp updated_at
    }

    roles {
        bigint id PK
        string name UK
        string slug UK
        string description
        timestamp created_at
        timestamp updated_at
    }

    permissions {
        bigint id PK
        string name UK
        string slug UK
        string group
        string description
        timestamp created_at
        timestamp updated_at
    }

    role_user {
        bigint id PK
        bigint user_id FK
        bigint role_id FK
        timestamp created_at
        timestamp updated_at
    }

    role_permissions {
        bigint id PK
        bigint role_id FK
        bigint permission_id FK
        timestamp created_at
        timestamp updated_at
    }
```

## 2. Table Specifications & Constraints

### `users`
- Primary Key: `id` (bigserial)
- Unique: `email`, `phone_number`
- Indexes: `status`
- Timestamps: `created_at`, `updated_at`

### `roles`
- Primary Key: `id` (bigserial)
- Unique: `name`, `slug`
- Initial Seeded Roles: `SUPER_ADMIN`, `ADMIN`, `STAFF`, `SELLER`, `CUSTOMER`, `DELIVERY_DRIVER`

### `permissions`
- Primary Key: `id` (bigserial)
- Unique: `name`, `slug`
- Index: `group`

### `role_user` (Pivot)
- Foreign Keys: `user_id -> users(id) ON DELETE CASCADE`, `role_id -> roles(id) ON DELETE CASCADE`
- Composite Unique Constraint: `(user_id, role_id)`

### `role_permissions` (Pivot)
- Foreign Keys: `role_id -> roles(id) ON DELETE CASCADE`, `permission_id -> permissions(id) ON DELETE CASCADE`
- Composite Unique Constraint: `(role_id, permission_id)`

