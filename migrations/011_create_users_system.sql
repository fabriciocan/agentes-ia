-- Migration 011: Create Users System
-- Purpose: Replace admin_users with new users table supporting companies and RBAC
-- Author: Claude Code
-- Date: 2026-02-15

BEGIN;

-- Rename existing users table (end-users) to avoid conflict
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        -- Check if it's the old end-users table (has external_id column)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'external_id') THEN
            ALTER TABLE users RENAME TO end_users;
            RAISE NOTICE 'Renamed users table to end_users';
        END IF;
    END IF;
END $$;

-- Create users table (replaces admin_users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- User details
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    password_hash TEXT NOT NULL,
    avatar_url TEXT,

    -- Invitation system
    invitation_token VARCHAR(64) UNIQUE,
    invitation_sent_at TIMESTAMPTZ,
    invitation_accepted_at TIMESTAMPTZ,
    invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended', 'deleted')),

    -- Preferences
    preferences JSONB DEFAULT '{}'::jsonb,

    -- Last activity tracking
    last_login_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_email_per_company UNIQUE (company_id, email)
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_invitation_token ON users(invitation_token) WHERE invitation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Data Migration: Migrate existing admin_users to users table
-- Link to the default company of their client
INSERT INTO users (
    id,
    company_id,
    email,
    name,
    password_hash,
    status,
    created_at,
    updated_at
)
SELECT
    au.id,
    c.id as company_id,
    au.email,
    au.name,
    au.password_hash,
    'active' as status,
    au.created_at,
    NOW() as updated_at
FROM admin_users au
JOIN clients cl ON au.client_id = cl.id
JOIN companies c ON c.client_id = cl.id
WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Add migration tracking column to admin_users (for dual system support)
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS migrated_to_users BOOLEAN DEFAULT FALSE;

-- Mark migrated admin_users
UPDATE admin_users
SET migrated_to_users = TRUE
WHERE id IN (SELECT id FROM users);

-- Create function to sync admin_users updates to users (for backward compatibility)
CREATE OR REPLACE FUNCTION sync_admin_user_to_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.migrated_to_users = TRUE THEN
        UPDATE users
        SET
            email = NEW.email,
            name = NEW.name,
            password_hash = NEW.password_hash,
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for backward compatibility
DROP TRIGGER IF EXISTS sync_admin_user_updates ON admin_users;
CREATE TRIGGER sync_admin_user_updates
    AFTER UPDATE ON admin_users
    FOR EACH ROW
    WHEN (NEW.migrated_to_users = TRUE)
    EXECUTE FUNCTION sync_admin_user_to_user();

COMMIT;
