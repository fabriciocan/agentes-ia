# PRD: Kanban de Captura de Clientes por Agente

## Visão Geral

Adicionar um Kanban de CRM onde cada agente de IA tem um board para rastrear o pipeline de clientes/leads. O n8n (via API) ou usuário manualmente empurra um cliente para uma coluna de entrada do kanban após eventos específicos (agendamento de reunião, primeiro contato, fim do atendimento pela IA). Usuários da empresa gerenciam esses cards, movendo-os entre colunas conforme o relacionamento avança.

## Arquitetura

```
agent_config (1) → kanban_boards (1) → kanban_columns (N) → kanban_cards (N)
kanban_cards → end_users (referência ao cliente)
kanban_cards → conversations (link para histórico, opcional)
```

---

## Checklist de Implementação

### Fase 1 — Banco de Dados

- [x] Adicionar modelo `kanban_boards` ao `prisma/schema.prisma`
- [x] Adicionar modelo `kanban_columns` ao `prisma/schema.prisma`
- [x] Adicionar modelo `kanban_cards` ao `prisma/schema.prisma`
- [x] Adicionar modelo `kanban_card_moves` ao `prisma/schema.prisma`
- [x] Adicionar relação `kanban_boards kanban_boards?` em `agent_configs`
- [x] Adicionar relação inversa em `end_users` e `conversations`
- [x] Rodar `npx prisma db push` (shadow db sem uuid-ossp; migrate dev não suportado)
- [x] Rodar `npx prisma generate`

### Fase 2 — Backend: Validação e Serviço

- [x] Adicionar schemas Zod em `server/utils/validation.ts`
  - [x] `kanbanBoardCreateSchema`
  - [x] `kanbanBoardUpdateSchema`
  - [x] `kanbanColumnCreateSchema`
  - [x] `kanbanCardCreateSchema`
  - [x] `kanbanCardMoveSchema`
  - [x] `kanbanCardsFilterSchema`
  - [x] `kanbanWebhookSchema`
- [x] Criar `server/services/kanban.service.ts`
  - [x] `getKanbanByAgent(agentId, companyId)`
  - [x] `createBoard(data)`
  - [x] `updateBoard(boardId, data)`
  - [x] `createColumn(boardId, data)`
  - [x] `reorderColumns(boardId, columnIds[])`
  - [x] `createCard(boardId, columnId, data)`
  - [x] `moveCard(cardId, toColumnId, userId)`
  - [x] `getCards(boardId, filters)`
  - [x] `handleWebhookEntry(agentId, clientData)`

### Fase 3 — Backend: API Routes (Boards)

- [x] `server/api/admin/agents/[agentId]/kanban.get.ts` — GET board do agente
- [x] `server/api/admin/agents/[agentId]/kanban.post.ts` — Criar board
- [x] `server/api/admin/agents/[agentId]/kanban.patch.ts` — Atualizar board
- [x] `server/api/admin/agents/[agentId]/kanban.delete.ts` — Deletar board

### Fase 4 — Backend: API Routes (Colunas)

- [x] `server/api/admin/kanban/[boardId]/columns.post.ts` — Criar coluna
- [x] `server/api/admin/kanban/[boardId]/columns/[columnId].patch.ts` — Atualizar coluna
- [x] `server/api/admin/kanban/[boardId]/columns/[columnId].delete.ts` — Deletar coluna
- [x] `server/api/admin/kanban/[boardId]/columns/reorder.patch.ts` — Reordenar colunas

### Fase 5 — Backend: API Routes (Cards)

- [x] `server/api/admin/kanban/[boardId]/cards.get.ts` — Listar cards com filtros
- [x] `server/api/admin/kanban/[boardId]/cards.post.ts` — Criar card manual
- [x] `server/api/admin/kanban/[boardId]/cards/[cardId].patch.ts` — Atualizar card
- [x] `server/api/admin/kanban/[boardId]/cards/[cardId]/move.patch.ts` — Mover card
- [x] `server/api/admin/kanban/[boardId]/cards/[cardId].delete.ts` — Deletar card

### Fase 6 — Backend: Webhook n8n

- [x] Criar `server/api/webhooks/kanban-entry.post.ts`
- [x] Autenticação via `X-API-Key` header (padrão existente)
- [x] Lógica: busca board pelo `agent_id`, identifica `entry_column_id`, cria/atualiza `end_user`, cria card

### Fase 7 — Permissões

- [x] Adicionar permissões ao seed/migration SQL:
  - [x] `kanban.read`
  - [x] `kanban.create`
  - [x] `kanban.update`
  - [x] `kanban.delete`

### Fase 8 — Frontend: Componentes

- [x] `app/components/kanban/KanbanColumn.vue` — Coluna individual com cards
- [x] `app/components/kanban/KanbanCard.vue` — Card do cliente
- [x] `app/components/kanban/KanbanCardModal.vue` — Modal com detalhes + histórico de conversa
- [x] `app/components/kanban/KanbanCreateModal.vue` — Modal criação/configuração do board
- [x] `app/components/kanban/KanbanFilters.vue` — Filtros (data, coluna, busca)

### Fase 9 — Frontend: Página Principal

- [x] Criar `app/pages/admin/kanban.vue`
- [x] Seletor de agente no topo
- [x] Estado vazio com botão "Criar Kanban"
- [x] Drag & drop de cards entre colunas
- [x] Badge "Entrada" na coluna de entrada configurada

### Fase 10 — Frontend: Navegação

- [x] Adicionar item "Kanban" no menu lateral em `app/layouts/admin.vue`

---

## Especificações Técnicas

### Schema Prisma

#### `kanban_boards`
```prisma
model kanban_boards {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  client_id        String   @db.Uuid
  company_id       String   @db.Uuid
  agent_config_id  String   @unique @db.Uuid
  name             String   @default("Kanban") @db.VarChar(255)
  entry_column_id  String?  @db.Uuid
  description      String?  @db.Text
  is_active        Boolean  @default(true)
  created_at       DateTime @default(now()) @db.Timestamptz(6)
  updated_at       DateTime @default(now()) @db.Timestamptz(6)

  clients          clients         @relation(fields: [client_id], references: [id], onDelete: Cascade)
  companies        companies       @relation(fields: [company_id], references: [id], onDelete: Cascade)
  agent_configs    agent_configs   @relation(fields: [agent_config_id], references: [id], onDelete: Cascade)
  entry_column     kanban_columns? @relation("entry_column", fields: [entry_column_id], references: [id])
  columns          kanban_columns[] @relation("board_columns")

  @@index([company_id])
  @@index([client_id])
  @@index([agent_config_id])
}
```

#### `kanban_columns`
```prisma
model kanban_columns {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  board_id    String   @db.Uuid
  name        String   @db.VarChar(255)
  color       String   @default("#6366f1") @db.VarChar(20)
  position    Int      @default(0)
  created_at  DateTime @default(now()) @db.Timestamptz(6)
  updated_at  DateTime @default(now()) @db.Timestamptz(6)

  board           kanban_boards  @relation("board_columns", fields: [board_id], references: [id], onDelete: Cascade)
  cards           kanban_cards[]
  entry_for_board kanban_boards? @relation("entry_column")

  @@index([board_id])
  @@index([board_id, position])
}
```

#### `kanban_cards`
```prisma
model kanban_cards {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  board_id        String    @db.Uuid
  column_id       String    @db.Uuid
  end_user_id     String?   @db.Uuid
  conversation_id String?   @db.Uuid
  title           String    @db.VarChar(255)
  client_name     String?   @db.VarChar(255)
  client_phone    String?   @db.VarChar(50)
  client_email    String?   @db.VarChar(255)
  notes           String?   @db.Text
  tags            String[]  @default([])
  position        Int       @default(0)
  source          String    @default("manual") @db.VarChar(50)
  entered_at      DateTime  @default(now()) @db.Timestamptz(6)
  created_at      DateTime  @default(now()) @db.Timestamptz(6)
  updated_at      DateTime  @default(now()) @db.Timestamptz(6)

  board           kanban_boards  @relation(fields: [board_id], references: [id], onDelete: Cascade)
  column          kanban_columns @relation(fields: [column_id], references: [id])
  end_user        end_users?     @relation(fields: [end_user_id], references: [id])
  conversation    conversations? @relation(fields: [conversation_id], references: [id])
  moves           kanban_card_moves[]

  @@index([board_id])
  @@index([column_id])
  @@index([end_user_id])
  @@index([created_at])
}
```

#### `kanban_card_moves`
```prisma
model kanban_card_moves {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  card_id        String   @db.Uuid
  from_column_id String?  @db.Uuid
  to_column_id   String   @db.Uuid
  moved_by       String?  @db.Uuid
  moved_at       DateTime @default(now()) @db.Timestamptz(6)

  card           kanban_cards   @relation(fields: [card_id], references: [id], onDelete: Cascade)

  @@index([card_id])
  @@index([moved_at])
}
```

---

### Endpoints da API

#### Boards
| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/api/admin/agents/:agentId/kanban` | Busca o board do agente (com colunas e cards) |
| POST | `/api/admin/agents/:agentId/kanban` | Cria o board do agente |
| PATCH | `/api/admin/agents/:agentId/kanban` | Atualiza nome, entry_column_id, description |
| DELETE | `/api/admin/agents/:agentId/kanban` | Remove o board |

#### Colunas
| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/api/admin/kanban/:boardId/columns` | Cria coluna |
| PATCH | `/api/admin/kanban/:boardId/columns/:columnId` | Atualiza nome/cor |
| DELETE | `/api/admin/kanban/:boardId/columns/:columnId` | Remove coluna |
| PATCH | `/api/admin/kanban/:boardId/columns/reorder` | Reordena colunas |

#### Cards
| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/api/admin/kanban/:boardId/cards` | Lista cards com filtros |
| POST | `/api/admin/kanban/:boardId/cards` | Cria card manualmente |
| PATCH | `/api/admin/kanban/:boardId/cards/:cardId` | Atualiza dados do card |
| PATCH | `/api/admin/kanban/:boardId/cards/:cardId/move` | Move card de coluna |
| DELETE | `/api/admin/kanban/:boardId/cards/:cardId` | Remove card |

#### Webhook (n8n)
| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/api/webhooks/kanban-entry` | N8N envia cliente para coluna de entrada |

**Payload do webhook:**
```json
{
  "agent_id": "uuid",
  "client_name": "João Silva",
  "client_phone": "+5511999999999",
  "client_email": "joao@email.com",
  "conversation_id": "uuid (opcional)",
  "notes": "Agendou reunião via calendly"
}
```
Autenticação via header `X-API-Key`.

---

### Fluxo de Uso (UX)

1. Usuário acessa `/admin/kanban` e seleciona um agente no dropdown
2. Se o agente ainda não tem kanban → exibe estado vazio com botão "Criar Kanban"
3. Modal de criação:
   - Define nome do board
   - Escreve descrição (texto livre: "o cliente entra após agendar reunião")
   - Cria as raias iniciais (lista editável com botão "+ Adicionar Raia")
4. Após salvar → board é exibido com as colunas em sequência horizontal
5. Usuário seleciona a coluna de entrada via dropdown nas configurações do board (badge "Entrada" aparece na coluna escolhida)
6. Cards podem ser criados manualmente ou chegam via webhook do n8n
7. Cards são arrastados entre colunas via drag & drop
8. Filtros disponíveis: range de datas, coluna, busca por nome/telefone

---

### Verificação End-to-End

- [ ] Rodar migration e confirmar 4 novas tabelas no PostgreSQL
- [ ] Acessar `/admin/kanban`, selecionar agente, criar board com 3 raias
- [ ] Definir coluna de entrada via dropdown e verificar badge "Entrada"
- [ ] Criar card manualmente → aparece na coluna correta
- [ ] Arrastar card entre colunas → persistência verificada após reload
- [ ] Filtrar por data → apenas cards no range aparecem
- [ ] Abrir modal do card → dados corretos + link para conversa (se houver)
- [ ] Chamar `POST /api/webhooks/kanban-entry` via Postman simulando n8n → card criado na entry_column
- [ ] Verificar isolamento multi-empresa: usuário da empresa A não vê kanban da empresa B
