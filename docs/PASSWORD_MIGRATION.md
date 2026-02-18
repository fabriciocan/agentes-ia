# Migração de Senhas: SHA256 → Bcrypt

## 📋 Resumo

O sistema foi migrado de SHA256 para **bcrypt** para hash de senhas, oferecendo segurança significativamente melhorada.

## ✅ O que foi alterado

### Arquivos Modificados

1. **`server/utils/password.ts`**
   - `hashPassword()`: Agora usa bcrypt com 10 salt rounds (assíncrona)
   - `verifyPassword()`: Suporta tanto bcrypt (novo) quanto SHA256 (legacy)

2. **`server/api/auth/login.post.ts`**
   - Busca usuário apenas por email
   - Verifica senha usando `verifyPassword()` assíncrona
   - Mantém suporte para senhas SHA256 legacy

3. **`server/services/user.service.ts`**
   - `inviteUser()`: Usa bcrypt para hash temporário
   - `acceptInvitation()`: Usa bcrypt para senha do usuário

## 🔄 Compatibilidade Retroativa

A função `verifyPassword()` é **retrocompatível**:

```typescript
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Detecta formato bcrypt (inicia com $2a$, $2b$, ou $2y$)
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    return bcrypt.compare(password, hash)
  }

  // Suporta SHA256 legacy
  const sha256Hash = createHash('sha256').update(password).digest('hex')
  return sha256Hash === hash
}
```

### Como Funciona

- **Novas senhas**: Automaticamente hashadas com bcrypt
- **Senhas existentes (SHA256)**: Continuam funcionando
- **Transição gradual**: Usuários serão migrados conforme fazem login

## 🔐 Segurança

### Por que Bcrypt?

| Aspecto | SHA256 | Bcrypt |
|---------|--------|--------|
| **Velocidade** | Muito rápida | Intencionalmente lenta |
| **Salt** | Não | Sim (automático) |
| **Ajustável** | Não | Sim (cost factor) |
| **Rainbow Tables** | Vulnerável | Resistente |
| **Brute Force** | Vulnerável | Resistente |

### Configuração

```typescript
const SALT_ROUNDS = 10 // Definido em server/utils/password.ts
```

**Tempo de hash:** ~100-200ms por senha (aceitável para login)

## 🧪 Testando

### Usuários de Teste

Todos os usuários criados pelo seed agora usam bcrypt:

```bash
npm run seed:users
```

**Credenciais de teste:**
- Admin: `admin@acme.com` / `admin123`
- Manager: `manager@acme.com` / `manager123`
- Viewer: `viewer@acme.com` / `viewer123`

### Verificar Hash no Banco

```sql
-- Ver formato do hash
SELECT
  email,
  LEFT(password_hash, 10) as hash_prefix,
  CASE
    WHEN password_hash LIKE '$2%' THEN 'bcrypt'
    ELSE 'sha256'
  END as hash_type
FROM users;
```

## 📝 Migração de Usuários Existentes

### Opção 1: Migração Automática no Login (Recomendada)

Adicione este código após verificação bem-sucedida no `login.post.ts`:

```typescript
// Se a senha é SHA256, migre para bcrypt
if (!user.password_hash.startsWith('$2')) {
  const newHash = await hashPassword(password)
  await query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [newHash, user.id]
  )
}
```

### Opção 2: Script de Migração em Massa

⚠️ **ATENÇÃO**: Requer que todos os usuários redefinam suas senhas

```typescript
// scripts/migrate-passwords.ts
// Marcar todos os hashes SHA256 como expirados
// Enviar emails de redefinição de senha
```

## 🔧 Manutenção

### Aumentar o Cost Factor

Se os computadores ficarem mais rápidos no futuro:

```typescript
// server/utils/password.ts
const SALT_ROUNDS = 12 // Era 10
```

Novas senhas usarão o novo valor. Bcrypt é retrocompatível com diferentes cost factors.

## 📊 Impacto no Desempenho

### Login

- **Antes (SHA256)**: ~1ms
- **Agora (Bcrypt)**: ~100-200ms

**Impacto:** Negligenciável para experiência do usuário (executado apenas no login)

### Criação de Usuário

- **Invite**: ~100-200ms (hash temporário)
- **Accept**: ~100-200ms (hash da senha real)

**Impacto:** Negligenciável (operação rara)

## ✅ Checklist de Migração

- [x] Instalar bcrypt e @types/bcrypt
- [x] Atualizar `server/utils/password.ts`
- [x] Atualizar `server/api/auth/login.post.ts`
- [x] Atualizar `server/services/user.service.ts`
- [x] Adicionar suporte retrocompatível para SHA256
- [x] Testar login com novos usuários bcrypt
- [x] Reexecutar seed de usuários
- [ ] Implementar migração automática no login (opcional)
- [ ] Testar com usuários SHA256 legacy (se existirem)
- [ ] Atualizar documentação

## 🚨 Troubleshooting

### Erro: "Invalid credentials" com senha correta

**Causa:** Hash no banco pode estar corrompido ou em formato incorreto

**Solução:**
```bash
# Recriar usuário de teste
npm run seed:users
```

### Performance lenta no login

**Causa:** Cost factor muito alto ou hardware lento

**Solução:**
```typescript
// Reduzir para 8 em desenvolvimento
const SALT_ROUNDS = process.env.NODE_ENV === 'production' ? 10 : 8
```

### Usuários SHA256 não conseguem fazer login

**Causa:** Suporte legacy removido acidentalmente

**Verificar:**
```typescript
// server/utils/password.ts deve ter:
if (!hash.startsWith('$2')) {
  // Legacy SHA256 support
}
```

## 📚 Referências

- [bcrypt npm package](https://www.npmjs.com/package/bcrypt)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [How bcrypt works](https://en.wikipedia.org/wiki/Bcrypt)