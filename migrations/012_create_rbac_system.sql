-- Migration 012: Create RBAC System
-- Purpose: Implement Role-Based Access Control with permissions, roles, and user assignments
-- Author: Claude Code
-- Date: 2026-02-15

BEGIN;

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Permission details
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Categorization
    resource VARCHAR(50) NOT NULL, -- e.g., 'agents', 'conversations', 'billing'
    action VARCHAR(50) NOT NULL,   -- e.g., 'create', 'read', 'update', 'delete'

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_permission_slug CHECK (slug ~ '^[a-z_]+\.[a-z_]+$')
);

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_permissions_slug ON permissions(slug);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    -- Role details
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,

    -- System role flag (cannot be edited or deleted)
    is_system BOOLEAN DEFAULT FALSE,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    -- System roles have no company_id (global), custom roles belong to a company
    CONSTRAINT unique_role_slug_per_company UNIQUE (company_id, slug),
    CONSTRAINT valid_role_slug CHECK (slug ~ '^[a-z_-]+$')
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_roles_company_id ON roles(company_id) WHERE deleted_at IS NULL AND is_system = FALSE;
CREATE INDEX IF NOT EXISTS idx_roles_slug ON roles(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system) WHERE is_system = TRUE;

-- Create unique index for system role slugs (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_system_role_slug
ON roles(slug) WHERE is_system = TRUE;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id)
);

-- Create indices for permission lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

    -- Assignment metadata
    assigned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_role UNIQUE (user_id, role_id)
);

-- Create indices for user permission lookups (critical for performance)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Create optimized view for user permissions (denormalized for performance)
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT DISTINCT
    ur.user_id,
    p.slug as permission_slug,
    p.resource,
    p.action
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id;

-- Create index on the view for fast permission checks
CREATE INDEX IF NOT EXISTS idx_user_permissions_view_user_id
ON user_roles(user_id);

COMMIT;
