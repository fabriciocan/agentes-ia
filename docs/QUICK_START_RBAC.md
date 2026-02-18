# RBAC System - Quick Start Guide

Get the multi-company RBAC system up and running in minutes.

---

## Prerequisites

✅ PostgreSQL database running
✅ Redis running (for permission caching)
✅ Node.js 18+ installed
✅ Database backup created

---

## Installation (5 Minutes)

### Step 1: Backup Your Database

```bash
# CRITICAL: Always backup first!
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Step 2: Run Migrations

```bash
# See what will happen (dry run)
npm run migrate:rbac:dry

# Run the migrations
npm run migrate:rbac
```

You'll see:
```
🚀 RBAC Migrations Runner
==========================================================

✓ Database connection successful
ℹ Found 3 admin user(s) that will be migrated
ℹ Found 2 client(s) - default companies will be created

⚠ WARNING: This will modify your database!
Type "yes" to continue:
```

### Step 3: Verify Installation

```bash
# Check database structure
npm run migrate:check
```

Expected output:
- ✅ 6 new tables created (companies, users, roles, etc.)
- ✅ Existing admin_users migrated to users
- ✅ Default companies created
- ✅ All users have Admin role
- ✅ Free subscriptions created

### Step 4: Restart Your App

```bash
npm run dev
```

---

## What Just Happened?

### Data Migration

1. **Companies Created**:
   - One default company per client
   - Named: "{Client Name} - Default Company"

2. **Users Migrated**:
   - All `admin_users` → `users` table
   - All users assigned "Admin" role (full access)
   - Passwords preserved (same hash)

3. **Permissions Seeded**:
   - 33+ granular permissions
   - 3 system roles (Admin, Viewer, Agent Manager)

4. **Subscriptions Created**:
   - All companies get "Free" plan
   - 30-day trial period
   - Usage limits applied

### Backward Compatibility

✅ **Existing users can still log in** (dual system support)
✅ **Legacy admin_users table still works**
✅ **All existing features continue working**
✅ **No breaking changes**

---

## First Steps After Installation

### 1. Test Login

Login with your existing admin credentials:

```bash
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

You should be logged in successfully! 🎉

### 2. Check Your Company

```bash
GET /api/admin/company
```

Response:
```json
{
  "id": "company-uuid",
  "name": "My Company - Default Company",
  "slug": "my-company-default-company",
  "stats": {
    "user_count": 1,
    "agent_count": 5,
    "conversation_count": 100
  }
}
```

### 3. Invite Your First Team Member

```bash
POST /api/admin/users/invite
{
  "email": "teammate@example.com",
  "name": "John Doe",
  "role_ids": ["viewer-role-id"]  // Get from /api/admin/roles
}
```

They'll receive an invitation to join your company! 📧

### 4. Check Available Roles

```bash
GET /api/admin/roles
```

You'll see:
- **Admin** - Full access to everything
- **Viewer** - Read-only access
- **Agent Manager** - Manage agents & knowledge

### 5. Create a Custom Role

```bash
POST /api/admin/roles
{
  "name": "Support Agent",
  "slug": "support-agent",
  "description": "Can view and respond to conversations",
  "permission_ids": [
    "conversations.read",
    "conversations.create"
  ]
}
```

---

## Common Use Cases

### Add Team Members

1. **Invite User**:
```bash
POST /api/admin/users/invite
{
  "email": "user@example.com",
  "role_ids": ["admin-role-id"]
}
```

2. **User Accepts Invitation**:
```bash
POST /api/auth/accept-invite
{
  "invitation_token": "token-from-email",
  "password": "newpassword123",
  "name": "Jane Doe"
}
```

3. **User Can Now Login**:
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "newpassword123"
}
```

### Create Department Roles

**Example: Customer Support Role**

```bash
POST /api/admin/roles
{
  "name": "Customer Support",
  "slug": "customer-support",
  "permission_ids": [
    "conversations.read",
    "conversations.create",
    "conversations.export",
    "agents.read",
    "analytics.read"
  ]
}
```

**Example: Content Manager Role**

```bash
POST /api/admin/roles
{
  "name": "Content Manager",
  "slug": "content-manager",
  "permission_ids": [
    "agents.read",
    "agents.update",
    "knowledge.read",
    "knowledge.create",
    "knowledge.update"
  ]
}
```

### Manage Subscriptions

**Check Current Plan**:
```bash
GET /api/admin/subscription
```

**Upgrade Plan**:
```bash
POST /api/admin/subscription/upgrade
{
  "plan_id": "professional-plan-id",
  "billing_period": "monthly"
}
```

**View Available Plans**:
```bash
GET /api/admin/subscription/plans
```

Plans:
- **Free**: 2 agents, 1 user, 100 conversations/month
- **Starter**: $29/mo - 10 agents, 5 users, 2K conversations
- **Professional**: $99/mo - 50 agents, 25 users, 10K conversations
- **Enterprise**: $499/mo - Unlimited everything

### View Analytics

**Dashboard**:
```bash
GET /api/admin/analytics/overview
```

**Usage Over Time**:
```bash
GET /api/admin/analytics/usage?granularity=day&start_date=2026-01-01
```

**Audit Logs**:
```bash
GET /api/admin/audit-logs?page=1&limit=50
```

---

## Permission System

### How It Works

1. **Users** are assigned **Roles**
2. **Roles** contain **Permissions**
3. **Permissions** control access to resources

Example:
```
User: john@example.com
  └─ Roles: [Admin]
      └─ Permissions: [*] (all permissions)

User: jane@example.com
  └─ Roles: [Viewer]
      └─ Permissions: [agents.read, conversations.read, ...]
```

### Check Permissions in Frontend

When building your UI, check permissions:

```typescript
// In Vue component
const user = await $fetch('/api/admin/users/me')
const canCreateAgents = user.permissions.includes('agents.create')

// Show/hide buttons based on permissions
<button v-if="canCreateAgents">Create Agent</button>
```

### Permission List

Full list in `/docs/RBAC_SYSTEM.md`, but here are key ones:

- `agents.*` - All agent operations
- `users.invite` - Invite team members
- `users.update` - Edit users and assign roles
- `billing.manage` - Upgrade/downgrade subscriptions
- `analytics.read` - View analytics dashboard
- `audit.read` - View audit logs (admin only)

---

## Troubleshooting

### "Invalid credentials" when logging in

✅ **Solution**: Your password hash is the same, try logging in with existing credentials

### "Permission denied" errors

✅ **Solution**: Check your role has the required permission
```bash
GET /api/admin/users/:id
```

### Can't see other team members

✅ **Solution**: They belong to different company (data isolation working!)

### Changes not reflecting immediately

✅ **Solution**: Permissions are cached for 5 minutes. Wait or restart app.

---

## Next Steps

1. 📚 Read full documentation: `/docs/RBAC_SYSTEM.md`
2. 👥 Invite your team members
3. 🎭 Create custom roles for your departments
4. 📊 Explore analytics dashboard
5. 💳 Upgrade subscription as needed

---

## Need Help?

- Full docs: `/docs/RBAC_SYSTEM.md`
- API reference: Section in RBAC_SYSTEM.md
- Check audit logs for security issues
- Review migration logs

---

## Summary

You now have:

✅ Multi-company support
✅ Team collaboration with role-based permissions
✅ 33+ granular permissions across all resources
✅ System roles + custom role creation
✅ Subscription management with usage limits
✅ Complete audit trail
✅ Analytics and reporting
✅ Backward compatibility with existing system

**Your existing users can log in immediately with full admin access!**

Happy building! 🚀
