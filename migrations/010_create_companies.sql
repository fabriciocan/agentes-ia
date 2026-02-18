-- Migration 010: Create Companies Table
-- Purpose: Add multi-company support within clients (tenants)
-- Author: Claude Code
-- Date: 2026-02-15

BEGIN;

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

    -- Company details
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    logo_url TEXT,

    -- Settings (JSON)
    settings JSONB DEFAULT '{}'::jsonb,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_company_slug_per_client UNIQUE (client_id, slug),
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_companies_client_id ON companies(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at DESC);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Data Migration: Create default company for each existing client
INSERT INTO companies (client_id, name, slug, status, created_at, updated_at)
SELECT
    id as client_id,
    name || ' - Default Company' as name,
    LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) as slug,
    'active' as status,
    created_at,
    NOW() as updated_at
FROM clients
WHERE NOT EXISTS (
    SELECT 1 FROM companies c WHERE c.client_id = clients.id
);

-- Add foreign key to agent_configs to link to companies
-- Note: We'll keep client_id for now (dual support) and add company_id
ALTER TABLE agent_configs
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Populate company_id for existing agent_configs
-- Link to the default company of each client
UPDATE agent_configs ac
SET company_id = c.id
FROM companies c
WHERE ac.client_id = c.client_id
AND ac.company_id IS NULL;

-- Create index on company_id for agent_configs
CREATE INDEX IF NOT EXISTS idx_agent_configs_company_id
ON agent_configs(company_id);

-- Add foreign key to conversations to link to companies
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Populate company_id for existing conversations
-- Link to the default company via agent_configs
UPDATE conversations conv
SET company_id = ac.company_id
FROM agent_configs ac
WHERE conv.agent_config_id = ac.id
AND conv.company_id IS NULL;

-- Create index on company_id for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_company_id
ON conversations(company_id);

COMMIT;
