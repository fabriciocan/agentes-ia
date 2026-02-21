-- Migration 019: Adiciona campos para integração com WhatsApp Cloud API (Meta Oficial)
-- Permite que cada agente conecte via EVO API (não oficial) ou Meta Cloud API (oficial)
-- em paralelo, sendo possível atuar como provedor de tecnologia.

-- 1. Adicionar campos Meta no agent_configs
ALTER TABLE agent_configs
  ADD COLUMN IF NOT EXISTS whatsapp_provider     VARCHAR(20)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS meta_phone_number_id  VARCHAR(50)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS meta_access_token     TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS meta_waba_id          VARCHAR(50)  DEFAULT NULL;

-- 2. Índice parcial para roteamento de webhooks por phone_number_id
CREATE INDEX IF NOT EXISTS idx_agent_configs_meta_phone_number_id
  ON agent_configs(meta_phone_number_id)
  WHERE meta_phone_number_id IS NOT NULL;

-- 3. Registrar migration
INSERT INTO migrations (filename) VALUES ('019_add_meta_whatsapp_fields.sql')
  ON CONFLICT (filename) DO NOTHING;
