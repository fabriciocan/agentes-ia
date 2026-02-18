-- Migration 014: Create Subscriptions System
-- Purpose: Implement subscription plans and billing management
-- Author: Claude Code
-- Date: 2026-02-15

BEGIN;

-- ============================================================================
-- STEP 1: Create Subscription Plans Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Plan details
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Pricing
    price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0,

    -- Limits
    limits JSONB DEFAULT '{}'::jsonb,
    -- Example limits structure:
    -- {
    --   "max_agents": 10,
    --   "max_users": 5,
    --   "max_conversations_per_month": 1000,
    --   "max_knowledge_documents": 100,
    --   "max_api_calls_per_month": 10000,
    --   "features": ["basic_analytics", "email_support"]
    -- }

    -- Features
    features JSONB DEFAULT '[]'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_visible BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_plan_slug CHECK (slug ~ '^[a-z_-]+$')
);

-- Create index for active plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 2: Create Subscriptions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,

    -- Subscription status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'trial', 'cancelled', 'expired', 'suspended')),

    -- Billing period
    billing_period VARCHAR(20) DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),

    -- Trial information
    trial_ends_at TIMESTAMPTZ,
    trial_used BOOLEAN DEFAULT FALSE,

    -- Subscription dates
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Payment information
    last_payment_at TIMESTAMPTZ,
    next_payment_at TIMESTAMPTZ,

    -- Usage tracking (reset monthly)
    usage_current_period JSONB DEFAULT '{}'::jsonb,
    -- Example usage structure:
    -- {
    --   "conversations": 150,
    --   "api_calls": 5000,
    --   "knowledge_documents": 25,
    --   "reset_at": "2026-02-01T00:00:00Z"
    -- }

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indices
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends_at ON subscriptions(trial_ends_at) WHERE trial_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at) WHERE expires_at IS NOT NULL;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 3: Seed Subscription Plans
-- ============================================================================

-- Free Plan
INSERT INTO subscription_plans (
    slug,
    name,
    description,
    price_monthly,
    price_yearly,
    limits,
    features
) VALUES (
    'free',
    'Free',
    'Perfect for trying out the platform',
    0.00,
    0.00,
    '{
        "max_agents": 2,
        "max_users": 1,
        "max_conversations_per_month": 100,
        "max_knowledge_documents": 10,
        "max_api_calls_per_month": 1000
    }'::jsonb,
    '["basic_analytics", "email_support"]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Starter Plan
INSERT INTO subscription_plans (
    slug,
    name,
    description,
    price_monthly,
    price_yearly,
    limits,
    features
) VALUES (
    'starter',
    'Starter',
    'Great for small teams getting started',
    29.00,
    290.00,
    '{
        "max_agents": 10,
        "max_users": 5,
        "max_conversations_per_month": 2000,
        "max_knowledge_documents": 100,
        "max_api_calls_per_month": 20000
    }'::jsonb,
    '["advanced_analytics", "priority_email_support", "custom_branding"]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Professional Plan
INSERT INTO subscription_plans (
    slug,
    name,
    description,
    price_monthly,
    price_yearly,
    limits,
    features
) VALUES (
    'professional',
    'Professional',
    'For growing teams with advanced needs',
    99.00,
    990.00,
    '{
        "max_agents": 50,
        "max_users": 25,
        "max_conversations_per_month": 10000,
        "max_knowledge_documents": 1000,
        "max_api_calls_per_month": 100000
    }'::jsonb,
    '["advanced_analytics", "priority_support", "custom_branding", "api_access", "webhooks", "sso", "audit_logs"]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Enterprise Plan
INSERT INTO subscription_plans (
    slug,
    name,
    description,
    price_monthly,
    price_yearly,
    limits,
    features
) VALUES (
    'enterprise',
    'Enterprise',
    'For large organizations with custom requirements',
    499.00,
    4990.00,
    '{
        "max_agents": -1,
        "max_users": -1,
        "max_conversations_per_month": -1,
        "max_knowledge_documents": -1,
        "max_api_calls_per_month": -1
    }'::jsonb,
    '["advanced_analytics", "dedicated_support", "custom_branding", "api_access", "webhooks", "sso", "audit_logs", "custom_integrations", "sla", "training"]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- STEP 4: Create Default Subscriptions for Existing Companies
-- ============================================================================

-- Create Free trial subscriptions for all existing companies (30 days)
INSERT INTO subscriptions (
    company_id,
    plan_id,
    status,
    billing_period,
    trial_ends_at,
    trial_used,
    current_period_start,
    current_period_end
)
SELECT
    c.id as company_id,
    sp.id as plan_id,
    'trial' as status,
    'monthly' as billing_period,
    NOW() + INTERVAL '30 days' as trial_ends_at,
    FALSE as trial_used,
    NOW() as current_period_start,
    NOW() + INTERVAL '30 days' as current_period_end
FROM companies c
CROSS JOIN subscription_plans sp
WHERE sp.slug = 'free'
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s WHERE s.company_id = c.id
  )
ON CONFLICT (company_id) DO NOTHING;

COMMIT;
