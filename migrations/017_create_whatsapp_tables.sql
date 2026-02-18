-- WhatsApp integration tables: dados_cliente, chat_messages, n8n_chat_histories

-- ============================================================
-- DADOS_CLIENTE (customer data per client/agent)
-- ============================================================
CREATE TABLE IF NOT EXISTS dados_cliente (
  id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at  TIMESTAMPTZ DEFAULT NULL,
  telefone    TEXT DEFAULT NULL,
  nomewpp     TEXT DEFAULT NULL,
  atendimento_ia TEXT DEFAULT NULL,
  setor       TEXT DEFAULT NULL,
  clientid    UUID DEFAULT NULL,
  agentid     UUID DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_dados_cliente_clientid ON dados_cliente(clientid);
CREATE INDEX IF NOT EXISTS idx_dados_cliente_agentid  ON dados_cliente(agentid);
CREATE INDEX IF NOT EXISTS idx_dados_cliente_telefone ON dados_cliente(telefone);

-- ============================================================
-- CHAT_MESSAGES (WhatsApp chat messages per client/agent)
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id           BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at   TIMESTAMPTZ DEFAULT NULL,
  phone        TEXT DEFAULT NULL,
  nomewpp      TEXT DEFAULT NULL,
  bot_message  TEXT DEFAULT NULL,
  user_message TEXT DEFAULT NULL,
  message_type TEXT DEFAULT NULL,
  active       BOOLEAN DEFAULT true,
  clientid     UUID DEFAULT NULL,
  agentid      UUID DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_clientid ON chat_messages(clientid);
CREATE INDEX IF NOT EXISTS idx_chat_messages_agentid  ON chat_messages(agentid);
CREATE INDEX IF NOT EXISTS idx_chat_messages_phone    ON chat_messages(phone);

-- ============================================================
-- N8N_CHAT_HISTORIES (n8n workflow chat history per client/agent)
-- ============================================================
CREATE TABLE IF NOT EXISTS n8n_chat_histories (
  id         INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_id VARCHAR DEFAULT NULL,
  message    JSONB DEFAULT NULL,
  clientid   UUID DEFAULT NULL,
  agentid    UUID DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_clientid   ON n8n_chat_histories(clientid);
CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_agentid    ON n8n_chat_histories(agentid);
CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_session_id ON n8n_chat_histories(session_id);
