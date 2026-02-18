# Platform Admin - Super Administrador

## 📋 Visão Geral

O **Platform Admin** é o nível mais alto de acesso no sistema, permitindo:
- Visualizar e gerenciar **todas as empresas** da plataforma
- Acessar **análises agregadas** de todo o sistema
- Gerenciar **configurações globais**
- Ter **visão completa do negócio**

## 🆚 Diferença entre Admin e Platform Admin

| Aspecto | Company Admin | Platform Admin |
|---------|---------------|----------------|
| **Escopo** | Uma empresa | Toda a plataforma |
| **Empresas** | Apenas sua empresa | Todas as empresas |
| **Usuários** | Usuários da empresa | Todos os usuários |
| **Analytics** | Dados da empresa | Dados agregados globais |
| **Configurações** | Empresa específica | Sistema global |

## 🚀 Criar Platform Admin

### Comando Rápido

```bash
npm run create:platform-admin
```

### Manual

```bash
npx tsx scripts/create-platform-admin.ts
```

## 🔐 Credenciais Padrão

| Campo | Valor |
|-------|-------|
| **Email** | superadmin@platform.com |
| **Senha** | superadmin123 |
| **Nome** | Platform Administrator |
| **Role** | Platform Admin |
| **Empresa** | Platform Administration |

⚠️ **IMPORTANTE**: Altere a senha após o primeiro login em produção!

## ✨ Capabilities

### 1. Visualizar Todas as Empresas

```
GET /api/platform/companies
```

**Retorna:**
```json
{
  "companies": [
    {
      "id": "uuid",
      "name": "ACME Corporation",
      "slug": "acme-corp",
      "status": "active",
      "client": {
        "id": "uuid",
        "name": "ACME",
        "slug": "acme"
      },
      "stats": {
        "userCount": 6,
        "agentCount": 3,
        "conversationCount": 150
      }
    }
  ]
}
```

### 2. Analytics da Plataforma

```
GET /api/platform/analytics
```

**Retorna:**
```json
{
  "stats": {
    "totalCompanies": 10,
    "totalUsers": 50,
    "totalAgents": 25,
    "totalConversations": 1500,
    "totalMessages": 15000
  },
  "companiesByStatus": [
    { "status": "active", "count": 8 },
    { "status": "suspended", "count": 2 }
  ],
  "recentActivity": [
    {
      "companyName": "ACME Corp",
      "conversationsToday": 25,
      "messagesToday": 250
    }
  ]
}
```

### 3. Todas as Permissões

O Platform Admin tem **TODAS** as permissões do sistema:

#### Permissões de Empresa
- `agents.*` - Gerenciar agentes
- `knowledge.*` - Gerenciar base de conhecimento
- `conversations.*` - Gerenciar conversas
- `users.*` - Gerenciar usuários
- `roles.*` - Gerenciar funções
- `billing.*` - Gerenciar assinaturas
- `analytics.*` - Ver análises
- `company.*` - Configurações da empresa

#### Permissões de Plataforma
- `platform.view_all_companies` - Ver todas as empresas
- `platform.manage_companies` - Gerenciar empresas
- `platform.view_all_users` - Ver todos os usuários
- `platform.system_settings` - Configurações do sistema
- `platform.analytics` - Analytics da plataforma

## 🎯 Casos de Uso

### 1. Monitoramento do Negócio

Como Platform Admin, você pode:
- Ver métricas agregadas de todas as empresas
- Identificar empresas com maior uso
- Monitorar crescimento da plataforma

### 2. Suporte a Clientes

- Acessar qualquer empresa para dar suporte
- Ver logs e atividades de qualquer usuário
- Resolver problemas técnicos

### 3. Administração

- Criar novas empresas para clientes
- Suspender empresas inadimplentes
- Gerenciar limites e quotas

## 🔒 Segurança

### Boas Práticas

1. **Senha Forte**: Use senhas complexas
2. **2FA**: Implemente autenticação de dois fatores (futuro)
3. **Audit Logs**: Todas as ações são logadas
4. **Acesso Limitado**: Apenas pessoas de confiança
5. **Rotação**: Troque senhas regularmente

### Logs de Auditoria

Todas as ações do Platform Admin são registradas:

```typescript
{
  userId: "platform-admin-id",
  action: "platform.view_all_companies",
  timestamp: "2026-02-16T...",
  metadata: { ... }
}
```

## 📊 Dashboard (Futuro)

### Páginas Planejadas

- `/platform` - Dashboard global
- `/platform/companies` - Listar empresas
- `/platform/companies/[id]` - Detalhes da empresa
- `/platform/analytics` - Analytics agregadas
- `/platform/users` - Todos os usuários
- `/platform/settings` - Configurações globais

## 🧪 Testando

### 1. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@platform.com","password":"superadmin123"}'
```

### 2. Listar Empresas

```bash
curl http://localhost:3000/api/platform/companies \
  -H 'Cookie: nuxt-session=...'
```

### 3. Ver Analytics

```bash
curl http://localhost:3000/api/platform/analytics \
  -H 'Cookie: nuxt-session=...'
```

## 📝 Estrutura do Banco

### Tabelas Relevantes

```sql
-- Platform Admin não pertence a uma empresa específica
SELECT * FROM users WHERE email = 'superadmin@platform.com';

-- Empresa "Platform Administration"
SELECT * FROM companies WHERE slug = 'platform-admin';

-- Role "Platform Admin"
SELECT * FROM roles WHERE slug = 'platform_admin';

-- Todas as permissões
SELECT * FROM role_permissions WHERE role_id IN (
  SELECT id FROM roles WHERE slug = 'platform_admin'
);
```

## 🚧 Roadmap

### Fase 1: Backend (✅ Concluído)
- [x] Migration para criar role
- [x] Script para criar usuário
- [x] Endpoints de API
- [x] Permissões RBAC

### Fase 2: Frontend (📋 Planejado)
- [ ] Dashboard de plataforma
- [ ] Listagem de empresas
- [ ] Analytics agregadas
- [ ] Gerenciamento de empresas

### Fase 3: Recursos Avançados (🔮 Futuro)
- [ ] Autenticação 2FA
- [ ] Audit logs detalhados
- [ ] Alertas e notificações
- [ ] Gestão de quotas
- [ ] Billing centralizado

## 🆘 Troubleshooting

### Erro: "Permission denied"

**Causa**: Usuário não tem permissões de plataforma

**Solução:**
```sql
-- Verificar se é Platform Admin
SELECT r.slug
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE u.email = 'superadmin@platform.com';

-- Deve retornar 'platform_admin'
```

### Erro: "Company not found"

**Causa**: Empresa Platform não foi criada

**Solução:**
```bash
npm run create:platform-admin
```

### Não vejo todas as empresas

**Causa**: Endpoint requer permissão específica

**Verificar:**
```sql
-- Ver permissões do usuário
SELECT p.slug
FROM user_roles ur
JOIN role_permissions rp ON rp.role_id = ur.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE ur.user_id = 'seu-user-id';
```

## 📚 Referências

- [RBAC System](./RBAC.md)
- [Seed Users](./SEED_USERS.md)
- [Password Migration](./PASSWORD_MIGRATION.md)
- [API Documentation](./API.md)
