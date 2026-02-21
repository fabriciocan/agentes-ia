-- Tabela independente para contas WhatsApp Business (Meta)
-- Desacoplada de agent_configs — o vínculo ao agente é feito separadamente
CREATE TABLE IF NOT EXISTS meta_whatsapp_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone_number_id       VARCHAR(50) NOT NULL UNIQUE,
  waba_id               VARCHAR(50) NOT NULL,
  access_token          TEXT NOT NULL,
  display_phone_number  VARCHAR(30),
  verified_name         VARCHAR(255),
  status                VARCHAR(20) DEFAULT 'connected',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_whatsapp_accounts_client
  ON meta_whatsapp_accounts(client_id);

CREATE INDEX IF NOT EXISTS idx_meta_whatsapp_accounts_phone_number_id
  ON meta_whatsapp_accounts(phone_number_id);

-- Adiciona referência opcional na agent_configs para vincular ao agente
ALTER TABLE agent_configs
  ADD COLUMN IF NOT EXISTS meta_whatsapp_account_id UUID REFERENCES meta_whatsapp_accounts(id) ON DELETE SET NULL;
