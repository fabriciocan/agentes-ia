# Seed de Usuários para Testes

Este documento descreve os usuários de teste criados no sistema para facilitar o desenvolvimento e testes de funcionalidades com diferentes níveis de permissão.

## Como executar o seed

```bash
npm run seed:users
```

## Usuários Criados

### 👨‍💼 Administradores (Acesso Completo)

Os administradores têm acesso total ao sistema, incluindo:
- Gerenciar agentes e base de conhecimento
- Visualizar e gerenciar conversas
- Gerenciar usuários e funções
- Configurações da empresa
- Assinaturas e faturamento
- Logs de auditoria
- Análises completas

**Credenciais:**

1. **Admin Principal**
   - Email: `admin@acme.com`
   - Senha: `admin123`
   - Nome: Admin User

2. **John Doe (Admin)**
   - Email: `john.admin@acme.com`
   - Senha: `john123`
   - Nome: John Doe (Admin)

---

### 🛠️ Gerentes de Agentes

Os gerentes de agentes podem:
- Criar, editar e excluir agentes
- Gerenciar base de conhecimento completa
- Visualizar conversas e análises (somente leitura)
- Visualizar configurações da empresa (somente leitura)

**NÃO podem:**
- Gerenciar usuários ou funções
- Alterar assinaturas ou faturamento
- Modificar configurações da empresa

**Credenciais:**

1. **Agent Manager Principal**
   - Email: `manager@acme.com`
   - Senha: `manager123`
   - Nome: Agent Manager

2. **Jane Smith (Manager)**
   - Email: `jane.manager@acme.com`
   - Senha: `jane123`
   - Nome: Jane Smith (Manager)

---

### 👁️ Visualizadores (Somente Leitura)

Os visualizadores têm acesso apenas para leitura:
- Visualizar agentes
- Visualizar base de conhecimento
- Visualizar conversas
- Visualizar análises
- Visualizar configurações da empresa
- Visualizar informações de assinaturas

**NÃO podem:**
- Criar, editar ou excluir qualquer recurso
- Fazer upload de documentos
- Modificar configurações

**Credenciais:**

1. **Viewer Principal**
   - Email: `viewer@acme.com`
   - Senha: `viewer123`
   - Nome: Viewer User

2. **Bob Johnson (Viewer)**
   - Email: `bob.viewer@acme.com`
   - Senha: `bob123`
   - Nome: Bob Johnson (Viewer)

---

## Estrutura de Dados Criada

O script de seed cria automaticamente:

1. **Cliente**: ACME Corporation
   - Slug: `acme-corp`
   - API Key: gerada automaticamente

2. **Empresa**: ACME Corporation
   - Slug: `acme-main`
   - Status: active
   - Vinculada ao cliente ACME Corporation

3. **6 Usuários**: 2 de cada função (Admin, Agent Manager, Viewer)
   - Todos vinculados à empresa ACME Corporation
   - Senhas já hashadas com bcrypt
   - Status: active
   - Funções do sistema atribuídas

## Testando Permissões

Use diferentes usuários para testar os seguintes cenários:

### Como Admin
```
Login: admin@acme.com / admin123
```
- Tente acessar todas as páginas do sistema
- Crie, edite e exclua recursos
- Gerencie usuários e funções
- Acesse configurações de faturamento

### Como Agent Manager
```
Login: manager@acme.com / manager123
```
- Crie e configure agentes
- Faça upload de documentos na base de conhecimento
- Tente acessar configurações de usuários (deve ser bloqueado)
- Tente modificar configurações da empresa (deve ser bloqueado)

### Como Viewer
```
Login: viewer@acme.com / viewer123
```
- Visualize agentes e conversas
- Tente criar ou editar recursos (deve ser bloqueado)
- Tente fazer upload de documentos (deve ser bloqueado)
- Verifique que todos os botões de ação estão desabilitados/ocultos

## Resetando os Dados

Para limpar e recriar os usuários de teste:

```bash
# O script é idempotente - você pode executá-lo múltiplas vezes
# Ele atualizará os usuários existentes em vez de criar duplicatas
npm run seed:users
```

## Estrutura de Permissões

O sistema usa três tabelas principais para RBAC:

- **permissions**: Define permissões granulares (ex: `agents.create`, `users.delete`)
- **roles**: Define funções do sistema (Admin, Viewer, Agent Manager)
- **user_roles**: Vincula usuários às suas funções

Para mais detalhes sobre o sistema RBAC, consulte:
- Migration 012: `migrations/012_create_rbac_system.sql`
- Migration 013: `migrations/013_seed_permissions_roles.sql`
