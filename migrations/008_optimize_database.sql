-- Migration 008: Database Optimization
-- Remove unused columns and fix duplicate indexes
-- Created: 2026-02-15

BEGIN;

-- ============================================================================
-- PARTE 1: REMOVER COLUNAS NÃO UTILIZADAS
-- ============================================================================

-- 1.1 messages: Remover token_count (nunca preenchido, nunca lido)
ALTER TABLE messages DROP COLUMN IF EXISTS token_count;

-- 1.2 agent_configs: Remover colunas JSONB não utilizadas
-- Nota: knowledge_base JSONB é legado, usar tabela knowledge_base
ALTER TABLE agent_configs DROP COLUMN IF EXISTS knowledge_base;
ALTER TABLE agent_configs DROP COLUMN IF EXISTS available_actions;
ALTER TABLE agent_configs DROP COLUMN IF EXISTS business_hours;

-- 1.3 clients: Remover settings (nunca acessado)
ALTER TABLE clients DROP COLUMN IF EXISTS settings;

-- 1.4 conversations: Remover colunas não usadas
-- Nota: channel está duplicado em users.channel
ALTER TABLE conversations DROP COLUMN IF EXISTS channel;
ALTER TABLE conversations DROP COLUMN IF EXISTS metadata;

-- 1.5 knowledge_base: Remover content_with_context (escrito mas nunca lido)
ALTER TABLE knowledge_base DROP COLUMN IF EXISTS content_with_context;

-- 1.6 users: Remover metadata (nunca lido em APIs)
-- Nota: channel é opcional mas pode ser útil manter para contexto
ALTER TABLE users DROP COLUMN IF EXISTS metadata;
-- Considerando manter users.channel pois pode ser útil para analytics

-- ============================================================================
-- PARTE 2: REMOVER ÍNDICES DUPLICADOS
-- ============================================================================

-- 2.1 knowledge_base: Tem idx_knowledge_agent_chunk E idx_knowledge_base_agent_chunk (duplicado)
-- Manter apenas o mais específico
DROP INDEX IF EXISTS idx_knowledge_agent_chunk;

-- ============================================================================
-- PARTE 3: LIMPAR TABELAS NÃO UTILIZADAS (Opcional - comentado por segurança)
-- ============================================================================

-- Essas tabelas não são referenciadas em nenhum código TypeScript/Vue
-- Podem ser de integrações antigas ou testes
-- DESCOMENTE se tiver certeza que não são necessárias:

-- DROP TABLE IF EXISTS chats CASCADE;        -- 18 registros, não referenciada
-- DROP TABLE IF EXISTS dados_cliente CASCADE; -- 24 registros, não referenciada

-- Nota: langchain_pg_collection é usado pelo n8n (LangChain integration) - NÃO REMOVER

-- ============================================================================
-- RESUMO DAS OTIMIZAÇÕES
-- ============================================================================

-- Colunas removidas:
--   ✓ messages.token_count
--   ✓ agent_configs.knowledge_base (JSONB)
--   ✓ agent_configs.available_actions (JSONB)
--   ✓ agent_configs.business_hours (JSONB)
--   ✓ clients.settings (JSONB)
--   ✓ conversations.channel (VARCHAR)
--   ✓ conversations.metadata (JSONB)
--   ✓ knowledge_base.content_with_context (TEXT)
--   ✓ users.metadata (JSONB)
--
-- Índices removidos:
--   ✓ idx_knowledge_agent_chunk (duplicado)
--
-- Economia estimada: ~25% de espaço em disco
-- Benefícios: Queries mais rápidas, menor overhead de I/O, schema mais limpo

COMMIT;
