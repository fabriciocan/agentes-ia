# Documentação Técnica — Plataforma de Agentes IA

> Última atualização: 2026-02-18

---

## Visão Geral

Esta é uma plataforma SaaS para criação e gestão de **agentes de IA conversacionais** com suporte a WhatsApp, base de conhecimento vetorial, equipes multi-tenant e sistema de permissões granular (RBAC).

**Stack principal:**
- **Frontend:** Nuxt 4.3 (SPA) + Vue 3 + Nuxt UI + Tailwind CSS
- **Backend:** Nitro (H3) com padrões de Fastify
- **Banco de dados:** PostgreSQL com extensão `pgvector`
- **Cache:** Redis (ioredis)
- **IA:** OpenAI (embeddings + chat)
- **WhatsApp:** EVO API
- **Automação:** n8n (via webhooks)
- **Processo:** PM2 (produção) / Docker Compose (desenvolvimento)

---

## Estrutura de Diretórios

```
/root/agentes-ia/
├── app/                          # Frontend (Nuxt 4)
│   ├── pages/                    # Páginas (rotas automáticas)
│   │   ├── admin/                # Painel administrativo
│   │   ├── chat/                 # Widget de chat embeddável
│   │   └── platform/             # Gestão de plataforma (super-admin)
│   ├── components/               # Componentes Vue reutilizáveis
│   │   ├── admin/                # Componentes da área admin
│   │   └── chat/                 # Componentes de chat
│   ├── composables/              # Lógica reativa (usePermissions, useChat…)
│   ├── layouts/                  # Templates de layout (admin.vue)
│   ├── middleware/               # Middleware client-side (auth, redirect)
│   ├── types/                    # Tipos TypeScript do frontend
│   └── assets/                   # CSS e estáticos
├── server/                       # Backend (Nitro/H3)
│   ├── api/                      # Endpoints REST
│   │   ├── admin/                # CRUD admin (usuários, agentes, roles)
│   │   ├── auth/                 # Login, logout, sessão, convites
│   │   ├── agents/               # Mensagens e configuração de agentes
│   │   ├── conversations/        # Histórico de conversas
│   │   ├── knowledge/            # Base de conhecimento
│   │   ├── webhooks/             # Receptor n8n
│   │   └── platform/             # Endpoints de plataforma (super-admin)
│   ├── middleware/               # Middleware server-side (auth, RBAC, rate-limit)
│   ├── services/                 # Lógica de negócio
│   ├── utils/                    # Utilitários (autorização, validação, logger)
│   └── plugins/                  # Plugins Nitro (injeção de dependências)
├── migrations/                   # 17 arquivos SQL de migração
├── scripts/                      # Scripts de setup e migração
├── docker/                       # Configurações Docker
├── nuxt.config.ts                # Configuração do Nuxt
└── ecosystem.config.cjs          # Configuração PM2
```

---

## Módulos do Sistema

### 1. Autenticação e Sessão

**Arquivos principais:**
- [server/api/auth/login.post.ts](server/api/auth/login.post.ts)
- [server/api/auth/logout.post.ts](server/api/auth/logout.post.ts)
- [server/api/auth/session.get.ts](server/api/auth/session.get.ts)
- [server/api/auth/accept-invite.post.ts](server/api/auth/accept-invite.post.ts)
- [app/pages/login.vue](app/pages/login.vue)

**Fluxo de login:**
```
1. Usuário envia e-mail + senha → POST /api/auth/login
2. Servidor verifica na tabela users (novo sistema)
3. Se não encontrar → verifica admin_users (sistema legado)
4. Em caso de sucesso → cria sessão com flag isLegacy
5. Frontend redireciona para /admin/
```

**Sistema dual (compatibilidade legada):**
- Tabela `users` → sistema RBAC completo (novo)
- Tabela `admin_users` → usuário único por client (legado, em depreciação)

**Tokens de convite:**
- 32 bytes hex gerados no servidor
- Validade de 7 dias
- Aceito via `POST /api/auth/accept-invite` onde o usuário define a senha

---

### 2. Autorização e Permissões (RBAC)

**Arquivos principais:**
- [server/middleware/admin-auth.ts](server/middleware/admin-auth.ts)
- [server/middleware/permissions.ts](server/middleware/permissions.ts)
- [server/utils/authorization.ts](server/utils/authorization.ts)
- [server/services/role.service.ts](server/services/role.service.ts)
- [app/composables/usePermissions.ts](app/composables/usePermissions.ts)

**Hierarquia de entidades:**
```
Clients
  └── Companies
        └── Users (com Roles)
              └── Roles → Permissions
```

**Fluxo de verificação de permissão:**
```
Request HTTP
  ↓
admin-auth.ts   → carrega user do DB pelo ID na sessão
  ↓
permissions.ts  → busca permissões no Redis (TTL 60s) ou DB
  ↓
event handler   → chama requirePermission(event, 'recurso.acao')
  ↓
checkPermission → avalia: '*' | 'agents.*' | 'agents.read'
  ↓
403 ou continua
```

**Tipos de permissão (20+):**
| Permissão | Descrição |
|---|---|
| `agents.read` | Visualizar agentes |
| `agents.create` | Criar agentes |
| `agents.update` | Editar agentes |
| `agents.delete` | Deletar agentes |
| `users.read` | Ver usuários da equipe |
| `users.invite` | Convidar usuários |
| `users.update` | Editar usuários |
| `users.delete` | Remover usuários |
| `roles.read` | Ver roles |
| `roles.create` | Criar roles customizadas |
| `roles.update` | Editar roles |
| `roles.delete` | Deletar roles |
| `conversations.read` | Ver conversas |
| `knowledge.read` | Ver base de conhecimento |
| `knowledge.manage` | Gerenciar KB |
| `billing.manage` | Gerenciar assinatura |
| `analytics.read` | Ver analytics |
| `audit.read` | Ver logs de auditoria |
| `settings.manage` | Configurar plataforma |
| `*` | Acesso total (admin) |

**Roles do sistema (imutáveis):**
- `admin` — acesso total
- `agent_manager` — gerencia agentes e KB
- `viewer` — somente leitura
- `platform_admin` — gestão de plataforma

**Roles customizadas:** criadas por empresa, editáveis, com permissões selecionáveis.

**Proteção contra escalada de privilégios:** um usuário não pode conceder permissões que ele próprio não possui.

**Cache de permissões:**
- Armazenado no Redis com chave `ai-agents:user-permissions:{userId}`
- TTL de 60 segundos
- Invalidado automaticamente ao alterar roles ou permissões

---

### 3. Banco de Dados (PostgreSQL + pgvector)

**Arquivo de conexão:** [server/services/postgres.service.ts](server/services/postgres.service.ts)

**Configuração do pool:**
- Máximo 20 conexões simultâneas
- Timeout idle: 30s
- Timeout de conexão: 5s
- Log automático de queries lentas (> 200ms)

**Tabelas principais:**

| Tabela | Descrição |
|---|---|
| `clients` | Tenants da plataforma (nível raiz) |
| `companies` | Empresas dentro de um client |
| `users` | Usuários do sistema (novo RBAC) |
| `admin_users` | Usuários legados (depreciado) |
| `agent_configs` | Configurações dos agentes de IA |
| `end_users` | Usuários finais das conversas |
| `conversations` | Sessões de conversa |
| `messages` | Mensagens individuais |
| `knowledge_base` | Documentos com embeddings vetoriais |
| `permissions` | Definições de permissões |
| `roles` | Roles do sistema e customizadas |
| `role_permissions` | Junção: role → permissões |
| `user_roles` | Junção: usuário → roles |
| `subscriptions` | Assinaturas ativas |
| `subscription_plans` | Planos e preços |
| `usage_logs` | Registro de uso (mensagens, tokens) |
| `audit_logs` | Trilha de auditoria de ações admin |

**Histórico de migrações (17 arquivos em [migrations/](migrations/)):**
- `001` — Schema inicial (agents, conversations, messages, knowledge)
- `002` — Extensão pgvector
- `003` — Seed do usuário admin padrão
- `004` — Integração WhatsApp
- `005` — Configuração de widget
- `006-009` — Otimizações, índices e melhorias no RAG
- `010` — Tabela de companies (multi-tenant)
- `011` — Novo sistema de users com RBAC
- `012` — Tabelas de permissões e roles
- `013` — Seed de permissões e roles do sistema
- `014` — Sistema de assinaturas
- `015` — Logs de uso
- `016` — Admin de plataforma
- `017+` — Features adicionais

---

### 4. Agentes de IA

**Arquivos principais:**
- [server/services/agent-config.service.ts](server/services/agent-config.service.ts)
- [server/api/admin/agents/](server/api/admin/agents/)
- [app/pages/admin/agents.vue](app/pages/admin/agents.vue)
- [app/components/admin/AdminAgentConfigForm.vue](app/components/admin/AdminAgentConfigForm.vue)

**Configuração de um agente:**
| Campo | Descrição |
|---|---|
| `name` | Nome do agente |
| `system_prompt` | Instrução de sistema (personalidade e comportamento) |
| `personality` | Perfil de personalidade |
| `tone` | Tom de comunicação (formal, informal…) |
| `language` | Idioma principal |
| `model` | Modelo OpenAI (ex: gpt-4o) |
| `temperature` | Criatividade (0.0–1.0) |
| `max_tokens` | Limite de tokens por resposta |
| `widget_config` | Configurações visuais do widget embeddável |
| `whatsapp_instance_name` | Nome da instância EVO API vinculada |

**Cache:** configs de agente cacheadas no Redis por 300 segundos.

---

### 5. Base de Conhecimento (RAG)

**Arquivos principais:**
- [server/services/knowledge.service.ts](server/services/knowledge.service.ts)
- [server/services/embedding.service.ts](server/services/embedding.service.ts)
- [server/utils/document-parser.ts](server/utils/document-parser.ts)
- [server/utils/text-analysis.ts](server/utils/text-analysis.ts)
- [app/components/admin/AdminKnowledgeBaseManager.vue](app/components/admin/AdminKnowledgeBaseManager.vue)

**Fluxo de ingestão de documento:**
```
1. Upload de arquivo (PDF, DOCX) ou texto manual
2. document-parser.ts → extrai texto bruto
3. @langchain/textsplitters → divide em chunks (800 chars, overlap 200)
4. text-analysis.ts → extrai idioma e palavras-chave por chunk
5. embedding.service.ts → gera vetor via OpenAI text-embedding-ada-002
6. Salva na tabela knowledge_base com vetor pgvector
```

**Busca semântica:**
```
1. Query do usuário → embedding via OpenAI
2. SELECT ... ORDER BY embedding <-> $query_vector LIMIT N
3. Retorna chunks mais relevantes por similaridade de cosseno
4. Chunks injetados no contexto do agente antes de gerar resposta
```

**Formatos suportados:** `.pdf`, `.docx`, texto puro.

---

### 6. Chat e Conversas

**Arquivos principais:**
- [server/services/conversation.service.ts](server/services/conversation.service.ts)
- [server/api/agents/message.post.ts](server/api/agents/message.post.ts)
- [app/components/chat/ChatWidget.vue](app/components/chat/ChatWidget.vue)
- [app/pages/chat/[sessionId].vue](app/pages/chat/[sessionId].vue)
- [app/composables/useChat.ts](app/composables/useChat.ts)

**Fluxo de mensagem:**
```
1. Usuário digita no ChatWidget
2. POST /api/agents/message (auth por API key do client)
3. getOrCreateConversation() → cria end_user + conversation se necessário
4. Salva mensagem do usuário no DB
5. Busca histórico de conversas (últimas N mensagens)
6. Busca chunks relevantes na knowledge_base (RAG)
7. Monta contexto e chama OpenAI
8. Salva resposta do agente no DB
9. Retorna resposta ao frontend
```

**Widget embeddável:**
- Rota: `/chat/[sessionId]?agent=AGENT_CONFIG_ID&key=API_KEY`
- Componente isolado sem layout
- Script de embed via `/api/widget/[id]`

---

### 7. Integração WhatsApp (EVO API)

**Arquivos principais:**
- [server/services/evo-api.service.ts](server/services/evo-api.service.ts)
- [server/api/admin/agents/[id]/whatsapp/](server/api/admin/agents/)
- [app/components/admin/AdminWhatsAppConnect.vue](app/components/admin/AdminWhatsAppConnect.vue)

**Fluxo de conexão:**
```
1. Admin clica em "Conectar WhatsApp" no painel
2. POST /api/admin/agents/[id]/whatsapp/connect
3. EVO API cria instância e retorna QR code
4. Admin escaneia QR com celular
5. Webhook EVO API notifica status 'connected'
6. agent_config atualizado com whatsapp_instance_name + status
```

**Funcionalidades do serviço EVO API:**
- Criar/deletar instância
- Obter QR code para pareamento
- Verificar estado de conexão
- Configurar webhook de entrada
- Enviar mensagens
- Logout da instância

**Fluxo de mensagem recebida via WhatsApp:**
```
WhatsApp → EVO API → Webhook → /api/webhooks/n8n → processamento → resposta
```

---

### 8. Automação com n8n

**Arquivo:** [server/api/webhooks/n8n.post.ts](server/api/webhooks/n8n.post.ts)

- Receptor de webhooks do n8n (autenticado por `NIST_N8N_WEBHOOK_SECRET`)
- Permite orquestrar fluxos externos: mensagens recebidas, notificações, integrações com CRM, etc.
- Complementa o processamento de mensagens do WhatsApp

---

### 9. Usuários e Equipes

**Arquivos principais:**
- [server/services/user.service.ts](server/services/user.service.ts)
- [server/api/admin/users/](server/api/admin/users/)
- [app/pages/admin/users.vue](app/pages/admin/users.vue)

**Ciclo de vida de um usuário:**
```
Convidado (invited) → Ativo (active) → Desativado (deleted_at)
```

**Operações disponíveis:**
- `listUsers()` — lista usuários da empresa com roles
- `inviteUser()` — cria usuário com status `invited`, envia e-mail
- `acceptInvitation()` — valida token (7 dias), ativa conta
- `updateUser()` — atualiza nome, status
- `assignRolesToUser()` — atualiza roles + invalida cache de permissões
- `deleteUser()` — soft delete (define `deleted_at`)

---

### 10. Roles e Permissões (Admin UI)

**Arquivos principais:**
- [server/services/role.service.ts](server/services/role.service.ts)
- [server/api/admin/roles/](server/api/admin/roles/)

**Regras de negócio:**
- Roles do sistema (`admin`, `viewer`, etc.) não podem ser editadas nem deletadas
- Roles customizadas podem ter qualquer subconjunto de permissões
- Não é possível deletar uma role que está atribuída a usuários ativos
- Criação/edição de role valida escalada de privilégios

---

### 11. Assinaturas e Planos

**Arquivos principais:**
- [server/services/subscription.service.ts](server/services/subscription.service.ts)
- [migrations/014_create_subscriptions.sql](migrations/014_create_subscriptions.sql)

**Tabelas:**
- `subscription_plans` — planos com limites (mensagens/mês, agentes, usuários)
- `subscriptions` — assinatura ativa por empresa
- `usage_logs` — consumo registrado por ação

---

### 12. Analytics e Auditoria

**Arquivos principais:**
- [server/services/analytics.service.ts](server/services/analytics.service.ts)
- [server/services/audit.service.ts](server/services/audit.service.ts)
- [server/api/admin/analytics/](server/api/admin/analytics/)

**Auditoria registra:**
- `USER_LOGIN`, `USER_INVITE_ACCEPTED`
- Criação/edição/exclusão de agentes, usuários, roles
- Campos: `action`, `resource_type`, `resource_id`, `changes` (before/after), `ip_address`, `user_agent`, `status`

**Analytics disponível:**
- Visão geral: total de conversas, mensagens, agentes ativos
- Uso por período
- Métricas de plataforma (super-admin)

---

### 13. Cache (Redis)

**Arquivo:** [server/services/redis.service.ts](server/services/redis.service.ts)

**Namespace:** `ai-agents:*`

| Chave | TTL | Conteúdo |
|---|---|---|
| `user-permissions:{userId}` | 60s | Array de permissões do usuário |
| `agent-config:{agentId}` | 300s | Configuração do agente |
| `all-permissions` | 600s | Lista completa de permissões |

**Funções:**
- `cacheGet<T>()` / `cacheSet()` / `cacheDel()`
- `invalidatePattern()` — deleção por wildcard
- `redisHealthCheck()` — ping/pong

---

### 14. Email

**Arquivo:** [server/services/email.service.ts](server/services/email.service.ts)

**Provedores suportados:**
- `console` — desenvolvimento (log no terminal)
- `resend` — Resend.com
- `sendgrid` — SendGrid
- `smtp` — SMTP genérico

**Uso atual:** envio de e-mails de convite com token de acesso.

---

### 15. Painel de Plataforma (Super-Admin)

**Arquivos principais:**
- [app/pages/platform/](app/pages/platform/)
- [server/api/platform/](server/api/platform/)

**Funcionalidades:**
- `/platform/companies` — listar e gerenciar todas as empresas
- `/platform/users` — listar todos os usuários da plataforma
- `/platform/analytics` — analytics agregado cross-empresa
- `/platform/settings` — configurações globais

**Acesso:** requer role `platform_admin`.

---

## Fluxos Completos

### Fluxo: Convidar e Ativar Usuário

```
Admin (users.invite)
  → POST /api/admin/users/invite { email, name, roleIds }
  → user.service.inviteUser()
      → cria user (status='invited')
      → gera token 32 bytes hex
      → atribui roles
      → registra audit_log
      → envia e-mail com link de convite
  → Usuário clica no link
  → POST /api/auth/accept-invite { token, password }
      → valida token (expiry 7 dias)
      → bcrypt.hash(password)
      → atualiza user (status='active', password_hash)
  → Usuário faz login normalmente
```

### Fluxo: Verificação de Permissão em Endpoint

```
GET /api/admin/agents (requer 'agents.read')
  ↓
admin-auth.ts
  → lê session.userId + isLegacy
  → se legado: carrega admin_user, permissions=['*']
  → se novo: carrega user com company_id
  ↓
permissions.ts
  → busca Redis: 'ai-agents:user-permissions:{userId}'
  → cache miss → query DB:
      SELECT p.name FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1
  → salva no Redis (TTL 60s)
  → event.context.permissions = ['agents.read', 'agents.create', ...]
  ↓
handler
  → requirePermission(event, 'agents.read')
  → checkPermission(['agents.read', ...], 'agents.read') → true
  → continua execução
```

### Fluxo: Ingestão de Documento na KB

```
Admin faz upload de PDF
  → POST /api/admin/agents/{id}/knowledge/upload
  → document-parser.ts → extrai texto do PDF
  → TextSplitter (LangChain) → chunks de 800 chars, overlap 200
  → Para cada chunk:
      → text-analysis.ts → detecta idioma, extrai keywords
      → embedding.service.ts → OpenAI text-embedding-ada-002 → vetor 1536d
      → INSERT INTO knowledge_base (agent_config_id, content, embedding, metadata)
  → Retorna contagem de chunks criados
```

### Fluxo: Busca Semântica (RAG)

```
Mensagem do usuário chega
  → embedding da query via OpenAI
  → SELECT content, metadata
    FROM knowledge_base
    WHERE agent_config_id = $agentId
    ORDER BY embedding <-> $queryVector
    LIMIT 5
  → Chunks retornados são injetados no system prompt
  → OpenAI gera resposta contextualizada
```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NUXT_DATABASE_URL` | ✅ | URL de conexão PostgreSQL |
| `NUXT_REDIS_URL` | ✅ | URL de conexão Redis |
| `NUXT_OPENAI_API_KEY` | ✅ | Chave da API OpenAI |
| `NUXT_SESSION_PASSWORD` | ✅ | Senha de criptografia da sessão (32+ chars) |
| `NUXT_EVO_API_URL` | ✅ | URL da instância EVO API (WhatsApp) |
| `NUXT_EVO_API_KEY` | ✅ | Chave da EVO API |
| `NUXT_N8N_WEBHOOK_SECRET` | ✅ | Secret para autenticar webhooks do n8n |
| `NUXT_RATE_LIMIT_MAX` | ❌ | Limite de requisições (padrão: 60) |
| `NUXT_RATE_LIMIT_WINDOW_SECONDS` | ❌ | Janela de rate limit em segundos (padrão: 60) |
| `NUXT_PUBLIC_APP_URL` | ❌ | URL pública da aplicação |
| `EMAIL_PROVIDER` | ❌ | console \| resend \| sendgrid \| smtp |
| `EMAIL_API_KEY` | ❌ | Chave do provedor de e-mail |
| `EMAIL_FROM` | ❌ | Endereço de remetente dos e-mails |

---

## Endpoints da API

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Login com e-mail e senha |
| POST | `/api/auth/logout` | Encerrar sessão |
| GET | `/api/auth/session` | Dados da sessão atual |
| POST | `/api/auth/accept-invite` | Aceitar convite e definir senha |

### Agentes (Admin)
| Método | Rota | Permissão |
|---|---|---|
| GET | `/api/admin/agents` | `agents.read` |
| POST | `/api/admin/agents` | `agents.create` |
| PATCH | `/api/admin/agents/[id]` | `agents.update` |
| DELETE | `/api/admin/agents/[id]` | `agents.delete` |

### Conhecimento
| Método | Rota | Permissão |
|---|---|---|
| GET | `/api/admin/agents/[id]/knowledge` | `knowledge.read` |
| POST | `/api/admin/agents/[id]/knowledge` | `knowledge.manage` |
| POST | `/api/admin/agents/[id]/knowledge/upload` | `knowledge.manage` |
| PATCH | `/api/admin/agents/[id]/knowledge/[entryId]` | `knowledge.manage` |
| DELETE | `/api/admin/agents/[id]/knowledge/[entryId]` | `knowledge.manage` |
| POST | `/api/admin/agents/[id]/knowledge/search` | `knowledge.read` |

### WhatsApp
| Método | Rota | Permissão |
|---|---|---|
| GET | `/api/admin/agents/[id]/whatsapp/status` | `agents.read` |
| GET | `/api/admin/agents/[id]/whatsapp/qrcode` | `agents.update` |
| POST | `/api/admin/agents/[id]/whatsapp/connect` | `agents.update` |
| POST | `/api/admin/agents/[id]/whatsapp/disconnect` | `agents.update` |

### Usuários e Roles
| Método | Rota | Permissão |
|---|---|---|
| GET | `/api/admin/users` | `users.read` |
| POST | `/api/admin/users/invite` | `users.invite` |
| PATCH | `/api/admin/users/[id]` | `users.update` |
| PATCH | `/api/admin/users/[id]/roles` | `users.update` |
| DELETE | `/api/admin/users/[id]` | `users.delete` |
| GET | `/api/admin/roles` | `roles.read` |
| POST | `/api/admin/roles` | `roles.create` |
| PATCH | `/api/admin/roles/[id]` | `roles.update` |
| DELETE | `/api/admin/roles/[id]` | `roles.delete` |
| GET | `/api/admin/me/permissions` | autenticado |

### Conversas
| Método | Rota | Permissão |
|---|---|---|
| GET | `/api/admin/conversations` | `conversations.read` |
| GET | `/api/admin/conversations/[id]` | `conversations.read` |

### Público (Widget)
| Método | Rota | Auth |
|---|---|---|
| POST | `/api/agents/message` | API key do client |
| GET | `/api/agents/[clientId]/config` | API key |
| GET | `/api/widget/[id]` | público |
| GET | `/api/health` | público |

### Webhooks
| Método | Rota | Auth |
|---|---|---|
| POST | `/api/webhooks/n8n` | HMAC secret |

---

## Segurança

| Camada | Mecanismo |
|---|---|
| Senhas | bcrypt com salt rounds |
| Sessões | Cookie criptografado (nuxt-auth-utils) |
| Permissões | RBAC com cache Redis (60s TTL) |
| Rate Limiting | 60 req/min por padrão |
| Validação | Zod em todos os endpoints |
| SQL Injection | Queries parametrizadas (pg driver) |
| Isolamento de dados | `company_id` em todas as queries sensíveis |
| Escalada de privilégio | Verificação em criação/edição de roles |
| Tokens de convite | 32 bytes hex, expiram em 7 dias |
| Soft deletes | `deleted_at IS NOT NULL` filtra registros |
| Auditoria | Todas ações admin registradas com IP e user-agent |

---

## Arquitetura Geral (Diagrama)

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (Nuxt SPA)                │
│  /admin/*  │  /platform/*  │  /chat/[sessionId]     │
│            │               │                         │
│  usePermissions()  useChat()  useAgent()             │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────────────┐
│               BACKEND (Nitro/H3)                    │
│                                                     │
│  Middleware Chain:                                  │
│  rate-limit → admin-auth → permissions → handler   │
│                                                     │
│  Services:                                          │
│  UserService │ RoleService │ AgentService           │
│  KnowledgeService │ ConversationService             │
│  EvoApiService │ EmailService │ AuditService        │
└──────┬──────────────────────────┬───────────────────┘
       │                          │
┌──────▼──────┐          ┌───────▼────────┐
│ PostgreSQL  │          │     Redis      │
│ + pgvector  │          │ (cache/sessão) │
└─────────────┘          └────────────────┘
       │
┌──────▼──────────────────────────────────┐
│           Serviços Externos             │
│  OpenAI API  │  EVO API (WhatsApp)      │
│  n8n Webhooks │ Resend/SendGrid (Email) │
└─────────────────────────────────────────┘
```

---

## Desenvolvimento Local

### Requisitos
- Node.js 20+
- Docker e Docker Compose
- Conta OpenAI com créditos
- Instância EVO API (opcional para WhatsApp)

### Subir ambiente

```bash
# 1. Clonar e instalar dependências
npm install

# 2. Copiar e configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 3. Subir PostgreSQL e Redis
docker-compose up -d

# 4. Executar migrações
npm run migrate

# 5. Iniciar servidor de desenvolvimento
npm run dev
```

### PM2 (Produção)

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 logs
```

---

## Notas de Migração de Sistema

O projeto está em transição do sistema legado (`admin_users`) para o novo sistema RBAC (`users` + roles + permissions):

- **Usuários legados** são identificados pela flag `isLegacy: true` na sessão
- Usuários legados recebem permissão curinga `['*']` (equivale a admin)
- Novos usuários passam pelo pipeline RBAC completo
- Ambos os sistemas coexistem para garantir compatibilidade retroativa
- A migração de usuários legados para o novo sistema deve ser feita manualmente ou via script em [scripts/](scripts/)
