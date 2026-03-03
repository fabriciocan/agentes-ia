# Deploy em Produção

Guia completo para instalação e reinstalação do sistema em um servidor Linux.

---

## Pré-requisitos

- Node.js 20+ (`node -v`)
- pnpm (`npm i -g pnpm`)
- Docker + Docker Compose
- Git

---

## 1. Clonar o repositório

```bash
git clone <url-do-repositorio> agentes-ia
cd agentes-ia
```

---

## 2. Configurar variáveis de ambiente

```bash
cp .env.example .env   # se existir, ou criar manualmente
nano .env
```

Variáveis obrigatórias:

```env
# Banco de dados
DATABASE_URL=postgresql://postgres:SENHA@localhost:5432/ai_agents
NUXT_DATABASE_URL=postgresql://postgres:SENHA@localhost:5432/ai_agents

# Redis
NUXT_REDIS_URL=redis://default:SENHA@localhost:6379

# Qdrant (vetor)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=SUA_API_KEY

# OpenAI (embeddings)
NUXT_OPENAI_API_KEY=sk-...

# Sessão (mínimo 32 caracteres, string aleatória segura)
NUXT_SESSION_PASSWORD=string-aleatoria-segura-com-32-chars

# Evolution API (WhatsApp)
NUXT_EVO_API_URL=https://sua-evo-url
NUXT_EVO_API_KEY=sua-chave

# N8N
NUXT_N8N_WEBHOOK_URL=https://seu-n8n/webhook/whatsapp
NUXT_N8N_UPLOAD_WEBHOOK_URL=https://seu-n8n/webhook/upload-base

# Meta WhatsApp Cloud API
NUXT_PUBLIC_META_APP_ID=seu-app-id
NUXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID=seu-config-id
NUXT_META_APP_SECRET=seu-app-secret
NUXT_META_WEBHOOK_VERIFY_TOKEN=string-de-verificacao
```

> **Atenção:** nunca commite o `.env` com credenciais reais.

---

## 3. Subir serviços de infraestrutura (Docker)

```bash
docker compose up -d
```

Verifica se todos estão saudáveis:

```bash
docker compose ps
```

Aguarde todos os serviços com status `healthy` antes de continuar.

> Em produção, o PostgreSQL costuma rodar direto no servidor (sem Docker). Nesse caso ajuste o `DATABASE_URL` no `.env` para apontar para o host correto e pule o serviço `postgres` do docker-compose.

---

## 4. Instalar dependências

```bash
pnpm install
```

---

## 5. Aplicar schema do banco de dados

> **Use sempre `db push`, nunca `migrate dev` em produção.** O `migrate dev` requer um shadow database com a extensão `uuid-ossp`, que pode não estar disponível.

```bash
pnpm db:push
```

Isso cria todas as tabelas sem gerar arquivos de migration.

---

## 6. Rodar os seeders

Execute na ordem abaixo:

### 6.1 Seed principal (permissões, roles, dados base)

```bash
pnpm db:seed
```

### 6.2 Seed de permissões do Kanban

```bash
npx tsx --env-file=.env scripts/seed-kanban-perms.ts
```

Esse script cria as permissões `kanban.read`, `kanban.create`, `kanban.update` e `kanban.delete` e as atribui a todos os roles do sistema.

> **Deve ser rodado em toda reinstalação** ou quando o menu de Kanban não aparecer para os usuários.

---

## 7. Criar o administrador da plataforma

Necessário na primeira instalação para ter acesso ao sistema:

```bash
pnpm create:platform-admin
```

Siga as instruções interativas para definir email e senha.

---

## 8. Build e iniciar a aplicação

```bash
pnpm build
node .output/server/index.mjs
```

Para rodar em background com PM2:

```bash
npm i -g pm2
pm2 start .output/server/index.mjs --name agentes-ia
pm2 save
pm2 startup   # configura reinício automático no boot
```

---

## 9. Reverificar após deploy

Checklist rápido:

- [ ] `docker compose ps` — todos os serviços `healthy`
- [ ] Acesso ao sistema pelo navegador
- [ ] Menu lateral exibe o item **Kanban**
- [ ] Login com o admin criado funciona
- [ ] É possível criar um agente e um board Kanban

---

## Atualização (re-deploy)

Quando houver novas versões:

```bash
git pull
pnpm install
pnpm db:push                                              # aplica novos modelos
npx tsx --env-file=.env scripts/seed-kanban-perms.ts     # re-roda se houver novas permissões
pnpm build
pm2 restart agentes-ia
```

---

## Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `pnpm db:push` | Aplica o schema Prisma no banco |
| `pnpm db:seed` | Seed principal de permissões e roles |
| `pnpm db:backup` | Faz backup do banco |
| `pnpm cache:clear` | Limpa cache Redis |
| `pnpm seed:users` | Seed de usuários de teste |
| `docker compose logs -f` | Logs em tempo real dos serviços |
| `pm2 logs agentes-ia` | Logs da aplicação |
| `pm2 restart agentes-ia` | Reinicia a aplicação |
