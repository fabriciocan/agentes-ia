# Multi-Company RBAC System

Complete documentation for the Role-Based Access Control system with multi-company support.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Permissions](#permissions)
7. [Usage Examples](#usage-examples)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The RBAC (Role-Based Access Control) system provides:

- **Multi-Company Support**: Multiple organizations within a single tenant
- **Team Collaboration**: Invite and manage team members
- **Granular Permissions**: 33+ fine-grained permissions across resources
- **Flexible Roles**: System roles + unlimited custom roles
- **Subscription Management**: Multiple plans with usage limits
- **Audit Logging**: Complete activity tracking for compliance
- **Analytics**: Usage metrics and performance tracking

### Key Features

✅ Complete data isolation between companies
✅ Dual system support (backward compatible with legacy admin_users)
✅ Redis-cached permissions (5-minute TTL)
✅ Privilege escalation prevention
✅ Invitation system with email tokens
✅ Soft deletes for data recovery

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        TENANT LAYER                          │
│                         (clients)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────▼────┐                 ┌────▼────┐
    │ Company │                 │ Company │
    │    A    │                 │    B    │
    └────┬────┘                 └────┬────┘
         │                           │
    ┌────▼────────────┐         ┌────▼────────────┐
    │ - Users         │         │ - Users         │
    │ - Agents        │         │ - Agents        │
    │ - Conversations │         │ - Conversations │
    │ - Subscription  │         │ - Subscription  │
    │ - Roles         │         │ - Roles         │
    └─────────────────┘         └─────────────────┘
```

### Database Hierarchy

1. **clients** - Tenant layer (existing)
2. **companies** - Organizations within tenant (NEW)
3. **users** - Team members (replaces admin_users)
4. **roles** - Permission groups (system + custom)
5. **permissions** - Granular access controls
6. **subscriptions** - Billing and usage limits

---

## Installation

### Prerequisites

- PostgreSQL 12+
- Node.js 18+
- Redis (for permission caching)

### Step 1: Backup Database

**CRITICAL**: Always backup before running migrations!

```bash
# Create backup
pg_dump $DATABASE_URL > backup-before-rbac.sql
```

### Step 2: Run Migrations

```bash
# Dry run (see what would happen)
npm run migrate:rbac:dry

# Actually run migrations
npm run migrate:rbac

# Or with force flag (skip confirmation)
npm run migrate:rbac -- --force
```

### Step 3: Verify Installation

After migration, verify:

1. ✅ Existing admin_users migrated to users table
2. ✅ Default companies created for each client
3. ✅ All users assigned Admin role
4. ✅ All companies have Free subscription (30-day trial)

```bash
# Check database
npm run migrate:check
```

### Step 4: Restart Application

```bash
npm run dev
```

---

## Database Schema

### Core Tables

#### `companies`

Organizations within a client (tenant).

```sql
- id: UUID (PK)
- client_id: UUID (FK → clients)
- name: VARCHAR(255)
- slug: VARCHAR(100) UNIQUE per client
- logo_url: TEXT
- settings: JSONB
- status: ENUM('active', 'suspended', 'deleted')
- deleted_at: TIMESTAMPTZ
- created_at, updated_at: TIMESTAMPTZ
```

#### `users`

Team members (replaces admin_users).

```sql
- id: UUID (PK)
- company_id: UUID (FK → companies)
- email: VARCHAR(255) UNIQUE per company
- name: VARCHAR(255)
- password_hash: TEXT
- avatar_url: TEXT
- invitation_token: VARCHAR(64)
- invitation_sent_at: TIMESTAMPTZ
- invitation_accepted_at: TIMESTAMPTZ
- invited_by_user_id: UUID (FK → users)
- status: ENUM('active', 'invited', 'suspended', 'deleted')
- preferences: JSONB
- last_login_at: TIMESTAMPTZ
- last_active_at: TIMESTAMPTZ
- deleted_at: TIMESTAMPTZ
- created_at, updated_at: TIMESTAMPTZ
```

#### `permissions`

Granular access controls (33+ permissions).

```sql
- id: UUID (PK)
- slug: VARCHAR(100) UNIQUE (e.g., 'agents.create')
- name: VARCHAR(255)
- description: TEXT
- resource: VARCHAR(50) (e.g., 'agents')
- action: VARCHAR(50) (e.g., 'create')
- created_at: TIMESTAMPTZ
```

#### `roles`

Permission groups (system + custom).

```sql
- id: UUID (PK)
- company_id: UUID (FK → companies, NULL for system roles)
- name: VARCHAR(100)
- slug: VARCHAR(100)
- description: TEXT
- is_system: BOOLEAN (cannot edit/delete)
- deleted_at: TIMESTAMPTZ
- created_at, updated_at: TIMESTAMPTZ
```

#### `subscriptions`

Billing and usage limits.

```sql
- id: UUID (PK)
- company_id: UUID (FK → companies) UNIQUE
- plan_id: UUID (FK → subscription_plans)
- status: ENUM('active', 'trial', 'cancelled', 'expired', 'suspended')
- billing_period: ENUM('monthly', 'yearly')
- trial_ends_at: TIMESTAMPTZ
- current_period_start, current_period_end: TIMESTAMPTZ
- usage_current_period: JSONB
- created_at, updated_at: TIMESTAMPTZ
```

### Junction Tables

- `user_roles` - Users ↔ Roles (N:N)
- `role_permissions` - Roles ↔ Permissions (N:N)

### Tracking Tables

- `usage_logs` - Analytics and usage tracking
- `audit_logs` - Compliance and security audit trail

---

## API Reference

### Authentication

#### POST `/api/auth/login`

Login with email and password. Supports both legacy and new users.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST `/api/auth/accept-invite`

Accept invitation and set password (PUBLIC endpoint).

**Request:**
```json
{
  "invitation_token": "64-char-token",
  "password": "newpassword123",
  "name": "John Doe"
}
```

---

### Company Management

#### GET `/api/admin/company`

Get current company details and stats.

**Permissions**: Automatic (any authenticated user)

**Response:**
```json
{
  "id": "uuid",
  "name": "My Company",
  "slug": "my-company",
  "stats": {
    "user_count": 5,
    "agent_count": 10,
    "conversation_count": 1500
  }
}
```

#### PATCH `/api/admin/company/settings`

Update company settings.

**Permissions**: `company.update`

**Request:**
```json
{
  "name": "New Company Name",
  "logo_url": "https://example.com/logo.png",
  "settings": {
    "timezone": "America/Sao_Paulo"
  }
}
```

---

### User Management

#### POST `/api/admin/users/invite`

Invite a new team member.

**Permissions**: `users.invite`

**Request:**
```json
{
  "email": "newuser@example.com",
  "name": "Jane Doe",
  "role_ids": ["role-uuid-1", "role-uuid-2"]
}
```

**Response:**
```json
{
  "user": { /* user object */ },
  "invitation_url": "/auth/accept-invite?token=..."
}
```

#### GET `/api/admin/users`

List all users in company.

**Permissions**: `users.read`

#### PATCH `/api/admin/users/:id/roles`

Update user role assignments.

**Permissions**: `users.update`

**Request:**
```json
{
  "role_ids": ["role-uuid-1", "role-uuid-2"]
}
```

---

### Roles & Permissions

#### GET `/api/admin/roles`

List all roles (system + custom for company).

**Permissions**: `roles.read`

#### POST `/api/admin/roles`

Create custom role.

**Permissions**: `roles.create`

**Request:**
```json
{
  "name": "Content Manager",
  "slug": "content-manager",
  "description": "Can manage agents and knowledge base",
  "permission_ids": ["perm-uuid-1", "perm-uuid-2"]
}
```

#### GET `/api/admin/permissions`

List all available permissions.

**Permissions**: `roles.read`

---

### Subscriptions

#### GET `/api/admin/subscription`

Get current subscription and usage.

**Permissions**: `billing.read`

#### POST `/api/admin/subscription/upgrade`

Upgrade or downgrade plan.

**Permissions**: `billing.manage`

**Request:**
```json
{
  "plan_id": "plan-uuid",
  "billing_period": "monthly"
}
```

---

### Analytics

#### GET `/api/admin/analytics/overview`

Dashboard overview stats.

**Permissions**: `analytics.read`

#### GET `/api/admin/analytics/usage`

Usage over time.

**Permissions**: `analytics.read`

**Query params:**
- `start_date`: ISO date
- `end_date`: ISO date
- `granularity`: `day` | `week` | `month`

---

## Permissions

### Format

Permissions follow the format: `resource.action`

Examples:
- `agents.create` - Create new agents
- `users.read` - View users
- `billing.manage` - Manage subscriptions

### Wildcard Permissions

- `*` - Full admin access (all permissions)
- `agents.*` - All agent permissions
- `users.*` - All user permissions

### Complete Permission List

**Agents**:
- `agents.read`, `agents.create`, `agents.update`, `agents.delete`, `agents.publish`

**Knowledge Base**:
- `knowledge.read`, `knowledge.create`, `knowledge.update`, `knowledge.delete`

**Conversations**:
- `conversations.read`, `conversations.create`, `conversations.delete`, `conversations.export`

**Users**:
- `users.read`, `users.invite`, `users.update`, `users.delete`

**Roles**:
- `roles.read`, `roles.create`, `roles.update`, `roles.delete`

**Billing**:
- `billing.read`, `billing.manage`

**Analytics**:
- `analytics.read`, `analytics.export`

**Company**:
- `company.read`, `company.update`

**Audit**:
- `audit.read`

**API Keys**:
- `api_keys.read`, `api_keys.create`, `api_keys.delete`

---

## System Roles

### Admin

**Full access** - Can do everything including manage team, billing, and all agents.

**Permissions**: `*` (wildcard)

### Viewer

**Read-only access** - Can view everything but cannot make changes.

**Permissions**: All `.read` permissions

### Agent Manager

**Manage agents** - Can manage agents and knowledge base, view conversations and analytics.

**Permissions**:
- All `agents.*` permissions
- All `knowledge.*` permissions
- `conversations.read`
- `analytics.read`
- `company.read`

---

## Usage Examples

### Check Permissions in Code

```typescript
// In API endpoint
import { requirePermission } from '~/server/utils/authorization'

export default defineEventHandler(async (event) => {
  // Require specific permission
  requirePermission(event, 'agents.create')

  // Or use helper
  if (event.context.can('agents.delete')) {
    // User has permission
  }

  // Check if admin
  const isAdmin = event.context.permissions?.includes('*')
})
```

### Validate Company Ownership

```typescript
import { requireCompanyOwnership } from '~/server/utils/authorization'

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')

  // Throws 404 if resource doesn't belong to user's company
  await requireCompanyOwnership(event, 'agent_configs', agentId)

  // Continue with operation...
})
```

### Create Custom Role

```typescript
import { createRole } from '~/server/services/role.service'

const role = await createRole(companyId, userId, {
  name: 'Support Agent',
  slug: 'support-agent',
  description: 'Can view and respond to conversations',
  permissionIds: [
    'conversations.read',
    'conversations.create',
    'analytics.read'
  ]
})
```

### Invite User

```typescript
import { inviteUser } from '~/server/services/user.service'

const { user, invitationToken } = await inviteUser(
  companyId,
  invitedByUserId,
  {
    email: 'newuser@example.com',
    name: 'Jane Doe',
    roleIds: ['viewer-role-id']
  }
)

// Send invitation email with token
// sendEmail(user.email, invitationToken)
```

---

## Security Best Practices

### ⚠️ Critical Rules

1. **Always Filter by company_id**

```sql
-- ❌ WRONG (security vulnerability)
SELECT * FROM agents WHERE id = $1

-- ✅ CORRECT
SELECT * FROM agents WHERE id = $1 AND company_id = $2
```

2. **Always Validate Ownership**

```typescript
// Before ANY operation
await requireCompanyOwnership(event, 'agents', agentId)
```

3. **Always Check Permissions**

```typescript
// Before actions
requirePermission(event, 'agents.create')
```

4. **Prevent Privilege Escalation**

Users cannot grant permissions they don't have. This is enforced in the role service.

5. **Invalidate Caches**

When permissions/roles change, invalidate caches:

```typescript
import { invalidateUserPermissions } from '~/server/utils/authorization'

await invalidateUserPermissions(userId)
```

### Password Security

- Passwords are hashed using SHA256 (current implementation)
- Minimum 8 characters required
- TODO: Migrate to bcrypt for improved security

### Session Management

- Sessions managed by nuxt-auth-utils
- Encrypted and stored securely
- Auto-refresh on activity

---

## Troubleshooting

### Migration Failed

**Error**: Migration XYZ failed

**Solution**:
1. Check error message in terminal
2. Restore from backup if needed
3. Fix the issue
4. Re-run migrations

### Permission Denied

**Error**: 403 Forbidden - Missing required permission

**Solution**:
1. Check user's roles: `GET /api/admin/users/:id`
2. Verify role has permission: `GET /api/admin/roles`
3. Assign correct role or add permission to role

### User Can't Access Resource

**Error**: 404 Not Found (but resource exists)

**Solution**:
- This is a security feature (don't reveal existence)
- Resource belongs to different company
- Check `company_id` on resource

### Cache Not Updating

**Problem**: Permission changes not reflected

**Solution**:
```typescript
// Manually invalidate cache
import { invalidateUserPermissions } from '~/server/utils/authorization'
await invalidateUserPermissions(userId)
```

Or wait 5 minutes for automatic expiration.

### Legacy Users Can't Log In

**Problem**: Old admin_users can't authenticate

**Solution**:
1. Check `admin_users.status = 'active'`
2. Verify password hash is correct
3. Check migration logs - were users migrated?
4. System supports both legacy and new users

---

## Migration Rollback

If you need to rollback:

1. **Restore from backup**:
```bash
psql $DATABASE_URL < backup-before-rbac.sql
```

2. **Keep admin_users table**: Legacy system still works

3. **Manual cleanup** (if needed):
```sql
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
```

---

## Support

For issues or questions:

1. Check this documentation
2. Review migration logs
3. Check audit logs for security issues
4. Review database schema

---

## License

Proprietary - Internal use only
