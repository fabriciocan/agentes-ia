-- Migration 013: Seed Permissions and Roles
-- Purpose: Create granular permissions and system roles (Admin, Viewer, Agent Manager)
-- Author: Claude Code
-- Date: 2026-02-15

BEGIN;

-- ============================================================================
-- STEP 1: Seed Permissions
-- ============================================================================

-- Agent permissions
INSERT INTO permissions (slug, name, description, resource, action) VALUES
    ('agents.read', 'View Agents', 'View agent configurations and details', 'agents', 'read'),
    ('agents.create', 'Create Agents', 'Create new agent configurations', 'agents', 'create'),
    ('agents.update', 'Update Agents', 'Modify existing agent configurations', 'agents', 'update'),
    ('agents.delete', 'Delete Agents', 'Delete agent configurations', 'agents', 'delete'),
    ('agents.publish', 'Publish Agents', 'Publish agents to production', 'agents', 'publish')
ON CONFLICT (slug) DO NOTHING;

-- Knowledge base permissions
INSERT INTO permissions (slug, name, description, resource, action) VALUES
    ('knowledge.read', 'View Knowledge', 'View knowledge base content', 'knowledge', 'read'),
    ('knowledge.create', 'Upload Knowledge', 'Upload documents to knowledge base', 'knowledge', 'create'),
    ('knowledge.update', 'Update Knowledge', 'Modify knowledge base content', 'knowledge', 'update'),
    ('knowledge.delete', 'Delete Knowledge', 'Delete knowledge base content', 'knowledge', 'delete')
ON CONFLICT (slug) DO NOTHING;

-- Conversation permissions
INSERT INTO permissions (slug, name, description, resource, action) VALUES
    ('conversations.read', 'View Conversations', 'View conversation history', 'conversations', 'read'),
    ('conversations.create', 'Create Conversations', 'Start new conversations', 'conversations', 'create'),
    ('conversations.delete', 'Delete Conversations', 'Delete conversation history', 'conversations', 'delete'),
    ('conversations.export', 'Export Conversations', 'Export conversation data', 'conversations', 'export')
ON CONFLICT (slug) DO NOTHING;

-- User management permissions
INSERT INTO permissions (slug, name, description, resource, action) VALUES
    ('users.read', 'View Users', 'View team members', 'users', 'read'),
    ('users.invite', 'Invite Users', 'Invite new team members', 'users', 'invite'),
    ('users.update', 'Update Users', 'Modify user details and roles', 'users', 'update'),
    ('users.delete', 'Remove Users', 'Remove team members', 'users', 'delete')
ON CONFLICT (slug) DO NOTHING;

-- Role management permissions
INSERT INTO permissions (slug, name, description, resource, action) VALUES
    ('roles.read', 'View Roles', 'View available roles', 'roles', 'read'),
    ('roles.create', 'Create Roles', 'Create custom roles', 'roles', 'create'),
    ('roles.update', 'Update Roles', 'Modify role permissions', 'roles', 'update'),
    ('roles.delete', 'Delete Roles', 'Delete custom roles', 'roles', 'delete')
ON CONFLICT (slug) DO NOTHING;

-- Billing & subscription permissions
INSERT INTO permissions (slug, name, description, resource, action) VALUES
    ('billing.read', 'View Billing', 'View subscription and billing details', 'billing', 'read'),
    ('billing.manage', 'Manage Billing', 'Update subscription and payment methods', 'billing', 'manage')
ON CONFLICT (slug) DO NOTHING;

-- Analytics permissions
INSERT INTO permissions (slug, name, description, resource, action) VALUES
    ('analytics.read', 'View Analytics', 'View usage analytics and reports', 'analytics', 'read'),
    ('analytics.export', 'Export Analytics', 'Export analytics data', 'analytics', 'export')
ON CONFLICT (slug) DO NOTHING;

-- Company settings permissions
INSERT INTO permissions (slug, name, description, resource, action) VALUES
    ('company.read', 'View Company Settings', 'View company details', 'company', 'read'),
    ('company.update', 'Update Company Settings', 'Modify company settings', 'company', 'update')
ON CONFLICT (slug) DO NOTHING;

-- Audit log permissions
INSERT INTO permissions (slug, name, description, resource, action) VALUES
    ('audit.read', 'View Audit Logs', 'View system audit logs', 'audit', 'read')
ON CONFLICT (slug) DO NOTHING;

-- API key permissions
INSERT INTO permissions (slug, name, description, resource, action) VALUES
    ('api_keys.read', 'View API Keys', 'View API keys', 'api_keys', 'read'),
    ('api_keys.create', 'Create API Keys', 'Generate new API keys', 'api_keys', 'create'),
    ('api_keys.delete', 'Delete API Keys', 'Revoke API keys', 'api_keys', 'delete')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- STEP 2: Create System Roles
-- ============================================================================

-- Admin role (full access)
INSERT INTO roles (slug, name, description, is_system, company_id)
VALUES (
    'admin',
    'Admin',
    'Full system access - can manage everything including team members, billing, and all agents',
    TRUE,
    NULL
)
ON CONFLICT (slug) WHERE is_system = TRUE DO NOTHING;

-- Viewer role (read-only)
INSERT INTO roles (slug, name, description, is_system, company_id)
VALUES (
    'viewer',
    'Viewer',
    'Read-only access - can view agents, conversations, and analytics but cannot make changes',
    TRUE,
    NULL
)
ON CONFLICT (slug) WHERE is_system = TRUE DO NOTHING;

-- Agent Manager role
INSERT INTO roles (slug, name, description, is_system, company_id)
VALUES (
    'agent_manager',
    'Agent Manager',
    'Can manage agents and knowledge base, view conversations and analytics',
    TRUE,
    NULL
)
ON CONFLICT (slug) WHERE is_system = TRUE DO NOTHING;

-- ============================================================================
-- STEP 3: Assign Permissions to System Roles
-- ============================================================================

-- Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'admin' AND r.is_system = TRUE
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Viewer: All read permissions EXCEPT users (only Admin can see users)
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'viewer'
  AND r.is_system = TRUE
  AND p.action IN ('read')
  AND p.resource != 'users'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Agent Manager: Agent and knowledge management + read access
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'agent_manager'
  AND r.is_system = TRUE
  AND (
    -- Full agent permissions
    p.resource = 'agents'
    -- Full knowledge permissions
    OR p.resource = 'knowledge'
    -- Read-only for others
    OR (p.resource IN ('conversations', 'analytics', 'company') AND p.action = 'read')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- STEP 4: Assign Admin Role to All Migrated Users
-- ============================================================================

-- Assign Admin role to all users migrated from admin_users
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT
    u.id as user_id,
    r.id as role_id,
    NOW() as assigned_at
FROM users u
CROSS JOIN roles r
WHERE r.slug = 'admin'
  AND r.is_system = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id AND ur.role_id = r.id
  )
ON CONFLICT (user_id, role_id) DO NOTHING;

COMMIT;
