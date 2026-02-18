-- Add WhatsApp instance fields to agent_configs
-- Links each agent to a WhatsApp instance via EVO API

ALTER TABLE agent_configs ADD COLUMN whatsapp_instance_name VARCHAR(255);
ALTER TABLE agent_configs ADD COLUMN whatsapp_instance_status VARCHAR(50) NOT NULL DEFAULT 'disconnected';
ALTER TABLE agent_configs ADD COLUMN whatsapp_number VARCHAR(50);

CREATE UNIQUE INDEX idx_agent_configs_whatsapp_instance ON agent_configs(whatsapp_instance_name) WHERE whatsapp_instance_name IS NOT NULL;
