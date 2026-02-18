-- Migration 015: Create Usage and Audit Logs
-- Purpose: Implement analytics tracking and compliance audit trails
-- Author: Claude Code
-- Date: 2026-02-15

BEGIN;

-- ============================================================================
-- STEP 1: Create Usage Logs Table (Analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Event details
    event_type VARCHAR(50) NOT NULL, -- e.g., 'conversation_created', 'agent_created', 'api_call', 'knowledge_uploaded'
    resource_type VARCHAR(50), -- e.g., 'agent', 'conversation', 'knowledge_document'
    resource_id UUID,

    -- Metrics
    quantity INTEGER DEFAULT 1, -- For counting events
    duration_ms INTEGER, -- For performance tracking
    tokens_used INTEGER, -- For AI usage tracking

    -- Additional data
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Example metadata:
    -- {
    --   "agent_name": "Support Bot",
    --   "conversation_length": 10,
    --   "model_used": "gpt-4",
    --   "user_agent": "Mozilla/5.0..."
    -- }

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indices optimized for time-series analytics
CREATE INDEX IF NOT EXISTS idx_usage_logs_company_id_created_at ON usage_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_event_type_created_at ON usage_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_resource_type_id ON usage_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id_created_at ON usage_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);

-- Note: Composite index with DATE() removed due to IMMUTABLE requirement
-- Use idx_usage_logs_company_id_created_at for time-based queries instead

-- ============================================================================
-- STEP 2: Create Audit Logs Table (Compliance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Action details
    action VARCHAR(100) NOT NULL, -- e.g., 'user.created', 'agent.updated', 'role.assigned'
    resource_type VARCHAR(50) NOT NULL, -- e.g., 'user', 'agent', 'role', 'company'
    resource_id UUID,

    -- Change tracking
    changes JSONB, -- Old and new values
    -- Example:
    -- {
    --   "old": {"name": "Old Name", "status": "active"},
    --   "new": {"name": "New Name", "status": "active"}
    -- }

    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),

    -- Result
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'error')),
    error_message TEXT,

    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indices for audit trail queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id_created_at ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created_at ON audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type_id ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status) WHERE status != 'success';

-- Note: Composite index with DATE() removed due to IMMUTABLE requirement
-- Use idx_audit_logs_company_id_created_at for time-based queries instead

-- ============================================================================
-- STEP 3: Create Helper Functions
-- ============================================================================

-- Function to log usage events
CREATE OR REPLACE FUNCTION log_usage_event(
    p_company_id UUID,
    p_user_id UUID,
    p_event_type VARCHAR,
    p_resource_type VARCHAR DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_quantity INTEGER DEFAULT 1,
    p_duration_ms INTEGER DEFAULT NULL,
    p_tokens_used INTEGER DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO usage_logs (
        company_id,
        user_id,
        event_type,
        resource_type,
        resource_id,
        quantity,
        duration_ms,
        tokens_used,
        metadata
    ) VALUES (
        p_company_id,
        p_user_id,
        p_event_type,
        p_resource_type,
        p_resource_id,
        p_quantity,
        p_duration_ms,
        p_tokens_used,
        p_metadata
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_company_id UUID,
    p_user_id UUID,
    p_action VARCHAR,
    p_resource_type VARCHAR,
    p_resource_id UUID DEFAULT NULL,
    p_changes JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_request_id VARCHAR DEFAULT NULL,
    p_status VARCHAR DEFAULT 'success',
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        company_id,
        user_id,
        action,
        resource_type,
        resource_id,
        changes,
        ip_address,
        user_agent,
        request_id,
        status,
        error_message,
        metadata
    ) VALUES (
        p_company_id,
        p_user_id,
        p_action,
        p_resource_type,
        p_resource_id,
        p_changes,
        p_ip_address,
        p_user_agent,
        p_request_id,
        p_status,
        p_error_message,
        p_metadata
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Create Partitioning for Logs (Optional - for high volume)
-- ============================================================================

-- Note: For production with high volume, consider partitioning by month
-- This is commented out for now but can be enabled later:

-- CREATE TABLE usage_logs_2026_02 PARTITION OF usage_logs
--     FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
--     FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

COMMIT;
