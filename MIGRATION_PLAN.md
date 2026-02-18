# Plano: Migração de `pg` raw queries para Prisma ORM + Qdrant para busca vetorial

## Status de Execução

| Passo | Status |
|---|---|
| Instalar dependências (@prisma/client, prisma, @qdrant/js-client-rest) | ✅ Concluído |
| Criar schema Prisma (db pull + ajustes) | ✅ Concluído |
| Criar singletons (server/lib/prisma.ts, qdrant.ts, prisma-helpers.ts) | ✅ Concluído |
| Baseline de migrações | ⏳ **Pendente** — requer container Docker PostgreSQL (sem pgvector) |
| Onda 1 (company, subscription, audit, agent-config) | ✅ Concluído |
| Onda 2 (user, role, conversation) | ✅ Concluído |
| Onda 3 (knowledge/Qdrant, analytics, authorization, login) | ✅ Concluído |
| Migrar arquivos API restantes (16 arquivos) | ✅ Concluído |
| Atualizar KnowledgeBase type (remover embedding) | ✅ Concluído |
| Scripts (baixa prioridade) | ✅ Concluído (scripts/test-analytics-queries.ts migrado para Prisma) |

## Próximo passo obrigatório: Baseline do banco

Quando subir o container Docker com **PostgreSQL padrão** (sem pgvector):

```bash
# 1. Marcar o banco atual como já migrado
npx prisma migrate resolve --applied 0_init

# 2. Criar migration para remover embedding/pgvector (se o banco antigo tiver pgvector)
npx prisma migrate dev --name remove_pgvector

# 3. Aplicar em produção
npx prisma migrate deploy
```

> **Nota:** O novo banco deve ser PostgreSQL simples, sem a extensão `vector`. O schema Prisma já não contém o campo `embedding`.

---

## Context

O projeto usa o driver nativo `pg` com queries SQL brutas via um wrapper `postgres.service.ts`. Todos os serviços importam a função `query()` desse arquivo. A migração para Prisma resolve problemas de manutenibilidade, type safety, e permite usar a API fluente do Prisma Client.

Adicionalmente, toda a parte vetorial (embeddings e busca semântica) será migrada do `pgvector` para o **Qdrant Cloud**, eliminando a dependência da extensão `vector(1536)` no PostgreSQL. O Qdrant gerenciará os vetores; o PostgreSQL (via Prisma) continuará gerenciando todos os demais metadados da `knowledge_base`.

**Restrições especiais identificadas:**
- `pgvector` — substituído integralmente pelo Qdrant (não haverá mais `Unsupported("vector(1536)")` no schema Prisma)
- `jsonb_set` atômico em `subscriptions.usage_current_period` → usar `$executeRaw`
- Queries de analytics com `DATE_TRUNC`, `LATERAL`, `FILTER (WHERE ...)`, CTEs → usar `$queryRaw`
- Tabela dinâmica em `validateCompanyOwnership` → usar `Prisma.raw()` com whitelist já existente
- PKs `BIGINT` nas tabelas WhatsApp → serializar com `.toString()` nas respostas

---

## Arquivos Críticos

- `server/services/postgres.service.ts` — wrapper atual, será deletado ao final
- `server/services/knowledge.service.ts` — reescrito para usar Qdrant (vetores) + Prisma (metadados)
- `server/services/embedding.service.ts` — permanece igual (gera vetores `text-embedding-3-small`, 1536 dims)
- `server/services/analytics.service.ts` — queries complexas com PostgreSQL-específico
- `server/services/subscription.service.ts` — `jsonb_set` atômico
- `server/utils/authorization.ts` — tabela dinâmica + cadeia de permissões (caminho crítico de performance)
- `server/types/database.types.ts` — interfaces existentes a migrar para camelCase

---

## Plano de Implementação

### Passo 1 — Instalar dependências

```bash
pnpm add @prisma/client @qdrant/js-client-rest
pnpm add -D prisma
```

Adicionar no `.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_agents"
QDRANT_URL="https://7b3b89b9-f601-42c0-a597-4855ed1847a4.sa-east-1-0.aws.cloud.qdrant.io:6333"
QDRANT_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.KXS0Zf8vOp8mes-QBRrj29T5b_i4iJHKCVzoCen-Ezc"
```
(`DATABASE_URL` é o mesmo valor de `NUXT_DATABASE_URL`)

---

### Passo 2 — Inicializar e criar o schema Prisma

```bash
npx prisma init --datasource-provider postgresql
npx prisma db pull   # introspect o banco existente
```

Após o pull, **anotar manualmente** o schema gerado em `prisma/schema.prisma`:

**Modelos e decisões-chave:**
- Todos os campos com `@map("snake_case")` + `@@map("table_name")` para manter naming do banco
- **`knowledge_base` sem coluna `embedding`** — a coluna `embedding vector(1536)` será removida do banco via migration Prisma; o ID do registro no Qdrant é o UUID do próprio registro no PostgreSQL, tornando a relação implícita
- `ip_address String?` (INET mapeado como String — PG ainda valida o tipo)
- `BigInt` PKs em `DadosCliente` e `ChatMessage`
- `user_permissions_view` — NÃO mapear como model, consultar via `$queryRaw`
- Campos JSONB → tipo `Json` do Prisma

**Tabelas a mapear:**
`clients`, `companies`, `users`, `admin_users`, `agent_configs`, `conversations`, `messages`, `knowledge_base`, `permissions`, `roles`, `role_permissions`, `user_roles`, `subscription_plans`, `subscriptions`, `usage_logs`, `audit_logs`, `dados_cliente`, `chat_messages`, `n8n_chat_histories`

**Migration necessária no banco:**
```sql
-- Remover extensão pgvector e coluna embedding
ALTER TABLE knowledge_base DROP COLUMN IF EXISTS embedding;
ALTER TABLE knowledge_base DROP COLUMN IF EXISTS content_with_context;
DROP EXTENSION IF EXISTS vector;
```
Esta migration será gerada automaticamente pelo Prisma após o schema ser atualizado (sem o campo `embedding`).

Gerar o client após editar o schema:
```bash
npx prisma generate
```

---

### Passo 3 — Criar os singletons para Nuxt 3

**Criar `server/lib/prisma.ts`:**
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Criar `server/lib/qdrant.ts`:**
```typescript
import { QdrantClient } from '@qdrant/js-client-rest'

const globalForQdrant = globalThis as unknown as { qdrant: QdrantClient | undefined }

export const qdrant =
  globalForQdrant.qdrant ??
  new QdrantClient({
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY!,
  })

if (process.env.NODE_ENV !== 'production') globalForQdrant.qdrant = qdrant

// Nome da collection no Qdrant (uma collection por agent_config)
// Convenção: "knowledge_${agentConfigId}"
export const knowledgeCollectionName = (agentConfigId: string) =>
  `knowledge_${agentConfigId.replace(/-/g, '_')}`
```

**Criar `server/lib/prisma-helpers.ts`:**
```typescript
// Usar em WHERE de tabelas com soft-delete (users, companies, agent_configs, roles)
export const notDeleted = { deletedAt: null } as const
```

**Modificar `server/plugins/services.ts`:** substituir `closePool()` por `prisma.$disconnect()` (Qdrant é stateless via HTTP, não precisa de disconnect).

---

### Passo 4 — Baseline das migrações existentes

Como o banco já existe com 17 migrações aplicadas:

```bash
mkdir prisma/migrations/0_init

npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql

npx prisma migrate resolve --applied "0_init"
```

A partir daqui, `prisma migrate dev` funcionará corretamente para novas mudanças.

---

### Passo 5 — Migrar os serviços (por onda)

#### Onda 1 — CRUD simples (sem agregações)

| Serviço | Padrão substituído |
|---|---|
| `company.service.ts` | Dynamic UPDATE → sparse `data: {}` object do Prisma; subqueries COUNT → `Promise.all` com `prisma.model.count()` |
| `subscription.service.ts` | `row_to_json(sp.*)` → `include: { plan: true }`; `jsonb_set` em `incrementUsage` → `$executeRaw`; `jsonb_build_object` em `resetMonthlyUsage` → `$executeRaw` |
| `audit.service.ts` | Dynamic WHERE → spread condicional no `where: {}`; `json_agg` para user → `include: { user: { select: {...} } }` |
| `agent-config.service.ts` | Dynamic UPDATE → sparse object |

#### Onda 2 — JOINs e agregações moderadas

| Serviço | Padrão substituído |
|---|---|
| `user.service.ts` | `json_agg` de roles → `include: { userRoles: { include: { role: true } } }`; batch INSERT roles → `deleteMany` + `createMany` |
| `role.service.ts` | `json_agg` permissions → `include: { rolePermissions: { include: { permission: true } } }`; `WHERE id IN (...)` → `{ in: [...] }` |
| `conversation.service.ts` | Subquery COUNT messages → `_count: { select: { messages: true } }`; dynamic WHERE → spread condicional; `INSERT ON CONFLICT` → `findFirst` + `create` |

#### Onda 3 — Queries complexas e reescrita do knowledge service

**`knowledge.service.ts` — reescrito completamente com Qdrant:**

O UUID do registro PostgreSQL é usado como `id` do ponto no Qdrant, criando uma relação implícita entre os dois sistemas.

**Estratégia por função:**

- **`getKnowledgeEntries(agentConfigId)`** → `prisma.knowledgeBase.findMany({ where: { agentConfigId } })` (somente metadados do PG)

- **`addKnowledgeEntry(agentConfigId, data)`**:
  1. `prisma.knowledgeBase.create(...)` → retorna o UUID gerado
  2. Gerar embedding com `embedding.service.ts`
  3. Garantir que a collection existe no Qdrant (criar se necessário, com `vectors: { size: 1536, distance: 'Cosine' }`)
  4. `qdrant.upsert(collectionName, { points: [{ id: entry.id, vector: embedding, payload: { agentConfigId, title } }] })`

- **`addKnowledgeChunks(agentConfigId, ...)`**:
  1. `prisma.knowledgeBase.createMany(...)` para todos os chunks (sem embedding)
  2. Para cada chunk: gerar embedding e upsert no Qdrant com o UUID do chunk como `id`

- **`updateKnowledgeEntry(entryId, agentConfigId, data)`**:
  1. `prisma.knowledgeBase.update(...)` para campos de metadados
  2. Se `content` mudou: regenerar embedding → `qdrant.upsert(...)` com o mesmo `id`

- **`deleteKnowledgeEntry(entryId, agentConfigId)`**:
  1. `prisma.knowledgeBase.delete({ where: { id: entryId } })`
  2. `qdrant.delete(collectionName, { points: [entryId] })`

- **`searchKnowledgeByEmbedding(agentConfigId, queryEmbedding, limit)`**:
  1. `qdrant.search(collectionName, { vector: queryEmbedding, limit, with_payload: false })`
  2. Extrair os IDs retornados pelo Qdrant
  3. `prisma.knowledgeBase.findMany({ where: { id: { in: qdrantIds } } })` para buscar metadados
  4. Reordenar pelo score do Qdrant e mapear `similarity = score` (Qdrant já retorna 0-1 para cosine)

**`analytics.service.ts`:**
- Stats simples (`COUNT` por tabela) → `Promise.all` com `prisma.model.count()`
- `getUsageOverTime` (DATE_TRUNC), `getTopAgents` (CTE), `getAgentPerformance` (LATERAL) → `$queryRaw`

**`authorization.ts`:**
- Cadeia `userRoles → roles → rolePermissions → permissions` → `prisma.userRole.findMany({ include: { role: { include: { rolePermissions: { include: { permission: true } } } } } })`
- `validateCompanyOwnership` com tabela dinâmica → `Prisma.raw(table)` com whitelist existente

**`server/api/auth/login.post.ts`:**
- JOIN `users + companies + clients` → `prisma.user.findFirst({ include: { company: { include: { client: true } } } })`
- JOIN `admin_users + clients` → `prisma.adminUser.findFirst({ include: { client: true } })`

---

### Passo 6 — Migrar tipos (database.types.ts)

Renomear campos gradualmente de `snake_case` para `camelCase` conforme cada serviço é migrado. O TypeScript aponta todos os callers que precisam de atualização.

---

### Passo 7 — Cleanup final

Após todas as ondas concluídas:
1. Remover `import { query } from './postgres.service'` de todos os arquivos
2. Remover `pg` e `@types/pg` do `package.json`
3. Deletar `server/services/postgres.service.ts`
4. Confirmar que a extensão `pgvector` foi removida do banco via `npx prisma migrate dev`
5. Atualizar scripts em `scripts/` (baixa prioridade) para usar `PrismaClient` diretamente

---

## Verificação

```bash
# Após Passo 2
npx prisma validate
npx prisma studio   # verificar dados visualmente

# Testar conexão com Qdrant
tsx -e "
import { QdrantClient } from '@qdrant/js-client-rest'
const c = new QdrantClient({ url: process.env.QDRANT_URL, apiKey: process.env.QDRANT_API_KEY })
console.log(await c.getCollections())
"

# Após cada serviço migrado
tsx scripts/test-rbac-system.ts
tsx scripts/test-analytics-queries.ts

# Verificar o servidor sobe sem erros
pnpm dev

# Verificar operações críticas end-to-end:
# 1. Login de usuário
# 2. Upload de documento → salvo no PG (metadados) + Qdrant (vetor)
# 3. Busca semântica → Qdrant retorna IDs → PG retorna metadados
# 4. Dashboard de analytics
# 5. Envio de mensagem via agent (RAG usando Qdrant)
```
