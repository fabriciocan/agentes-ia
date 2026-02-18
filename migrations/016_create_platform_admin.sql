-- Migration 016: Create Platform Admin Role
-- Purpose: Add a platform-level admin role that can manage multiple companies
-- Author: Claude Code
-- Date: 2026-02-16

BEGIN;

-- ============================================================================
-- STEP 1: Create Platform Admin Role
-- ============================================================================

-- Platform Admin role (super admin across all companies)
INSERT INTO roles (slug, name, description, is_system, company_id)
VALUES (
    'platform_admin',
    'Platform Admin',
    'Platform-level administrator with access to all companies and system-wide settings',
    TRUE,
    NULL
)
ON CONFLICT (slug) WHERE is_system = TRUE DO NOTHING;

-- ============================================================================
-- STEP 2: Create Platform Admin Permissions
-- ============================================================================

-- Platform-level permissions
INSERT INTO permissions (slug, name, description, resource, action) VALUES
    ('platform.view_all_companies', 'View All Companies', 'View and access all companies in the platform', 'platform', 'read'),
    ('platform.manage_companies', 'Manage Companies', 'Create, edit, and delete companies', 'platform', 'manage'),
    ('platform.view_all_users', 'View All Users', 'View users across all companies', 'platform', 'read'),
    ('platform.system_settings', 'System Settings', 'Manage platform-wide system settings', 'platform', 'manage'),
    ('platform.analytics', 'Platform Analytics', 'View aggregated analytics across all companies', 'platform', 'read')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- STEP 3: Assign All Permissions to Platform Admin
-- ============================================================================

-- Platform Admin gets ALL existing permissions plus platform-specific ones
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'platform_admin' AND r.is_system = TRUE
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- STEP 4: Create "Platform" Company for Platform Admins
-- ============================================================================

-- First, ensure a "Platform" client exists
INSERT INTO clients (name, slug, api_key, created_at, updated_at)
VALUES (
    'Platform',
    'platform',
    'platform_' || gen_random_uuid()::text,
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
RETURNING id;

-- Create "Platform" company under the Platform client
INSERT INTO companies (client_id, name, slug, status, created_at, updated_at)
SELECT
    c.id,
    'Platform Administration',
    'platform-admin',
    'active',
    NOW(),
    NOW()
FROM clients c
WHERE c.slug = 'platform'
ON CONFLICT (client_id, slug) DO UPDATE SET updated_at = NOW();

COMMIT;
