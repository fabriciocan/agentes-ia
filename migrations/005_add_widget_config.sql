-- Add widget configuration column to agent_configs
ALTER TABLE agent_configs ADD COLUMN widget_config JSONB NOT NULL DEFAULT '{}';
