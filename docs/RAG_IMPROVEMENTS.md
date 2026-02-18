# 🚀 Melhorias no Sistema RAG

## ✅ O que foi implementado

### 1️⃣ **Dependências Instaladas**
- ✅ `langchain` - Framework para trabalhar com LLMs
- ✅ `@langchain/textsplitters` - Text splitters avançados para chunking inteligente

### 2️⃣ **Schema do Banco de Dados** (Migration 007)
- ✅ Adicionado campo `content_with_context` - Armazena chunk com contexto para debugging
- ✅ Melhorado campo `metadata` (JSONB) - Metadata rica em cada chunk
- ✅ Adicionado campos `file_size`, `file_type`, `chunk_index` se não existiam
- ✅ Criado índice GIN para full-text search: `idx_knowledge_content_fts`
- ✅ Criado índice GIN para metadata: `idx_knowledge_metadata_gin`
- ✅ Criado índice composto: `idx_knowledge_agent_chunk`
- ✅ Função de busca híbrida: `search_knowledge_hybrid()` - Combina similaridade vetorial + keywords
- ✅ Função de busca por keywords: `search_knowledge_by_keywords()`

### 3️⃣ **Melhorias no Chunking** (`embedding.service.ts`)
**Antes:**
```typescript
// Chunking simples por caracteres
export function chunkText(text: string, maxChunkSize = 1000, overlap = 200)
```

**Depois:**
```typescript
// RecursiveCharacterTextSplitter do LangChain
export async function chunkText(text: string, maxChunkSize = 800, overlap = 200)
```

**Melhorias:**
- ✅ Usa `RecursiveCharacterTextSplitter` do LangChain
- ✅ Separadores inteligentes (seções, parágrafos, sentenças, palavras)
- ✅ Overlap de 200 caracteres (antes: simples)
- ✅ Chunk size otimizado: 800 caracteres (antes: 1000)
- ✅ Respeita quebras naturais do texto
- ✅ Logging detalhado do processo

**Separadores em ordem de prioridade:**
1. `\n\n\n` - Quebras de seção
2. `\n\n` - Quebras de parágrafo
3. `\n` - Quebras de linha
4. `. ` - Sentenças
5. `! ` `? ` `; ` `, ` - Pontuação
6. ` ` - Palavras
7. `''` - Caracteres (fallback)

### 4️⃣ **Funções Auxiliares** (`text-analysis.ts`)

#### `extractKeywords(text: string): string[]`
Extrai keywords importantes do texto:
- ✅ Medidas e dimensões: `1.60 m`, `76 cm`, `2 x 3 m`
- ✅ Termos técnicos: `installation`, `setup`, `requirements`, `specifications`
- ✅ Termos de espaço: `required space`, `minimum space`, `distance`
- ✅ Suporte multi-idioma: PT, EN, DE, ES
- ✅ Preços e percentuais: `€100`, `R$ 50`, `15%`
- ✅ Frases importantes (2-3 palavras capitalizadas)

#### `detectLanguage(text: string): 'pt' | 'en' | 'de' | 'es' | 'unknown'`
Detecta o idioma do texto automaticamente:
- ✅ Analisa amostra do início e meio do documento
- ✅ Conta palavras comuns de cada idioma
- ✅ Retorna idioma com maior score
- ✅ Suporta: Português, Inglês, Alemão, Espanhol

#### Funções Auxiliares:
- ✅ `hasNumericalData()` - Detecta números, medidas, preços
- ✅ `hasTableStructure()` - Detecta tabelas (Markdown, TSV, alinhadas)
- ✅ `estimatePages()` - Estima número de páginas (3000 chars/página)

### 5️⃣ **Contexto nos Chunks** (`knowledge.service.ts`)

**Antes:**
```typescript
const chunk = chunks[i]
const embedding = await generateEmbedding(chunk)
```

**Depois:**
```typescript
const contextualChunk = `
Documento: ${title}
Tipo: ${contentType}
Idioma: ${language}
Parte ${i + 1} de ${chunks.length}

${chunk}
`.trim()

const embedding = await generateEmbedding(contextualChunk)
```

**Por que isso é importante?**
- O embedding captura não só o conteúdo, mas também o CONTEXTO
- A IA sabe de qual documento veio o chunk
- A IA sabe qual é o tipo de documento (PDF, DOCX, etc.)
- A IA sabe a posição do chunk no documento
- Melhora significativamente a recuperação de informações

### 6️⃣ **Metadata Rica**

Cada chunk agora armazena:
```json
{
  "chunkIndex": 0,
  "totalChunks": 35,
  "chunkSize": 526,
  "contextualChunkSize": 620,
  "keywords": ["required space", "1.60 m", "installation", "distance", "platform"],
  "language": "en",
  "hasNumbers": true,
  "hasTable": false,
  "estimatedPages": 6,
  "processedAt": "2025-02-12T10:30:00.000Z",
  "originalFilename": "Pixformance-Fitness-Brochure.pdf",
  "uploadedAt": "2025-02-12T10:30:00.000Z",
  "uploadedBy": "client-id",
  "mimeType": "application/pdf",
  "fileSize": 1234567,
  "contentLength": 18420
}
```

### 7️⃣ **Endpoint de Upload Melhorado**

**Response do endpoint agora retorna:**
```json
{
  "data": {
    "filename": "Pixformance-Fitness-Brochure.pdf",
    "fileSize": 1234567,
    "mimeType": "application/pdf",
    "chunks": 35,
    "totalChars": 18420,
    "avgChunkSize": 526,
    "analysis": {
      "language": "en",
      "hasNumericalData": true,
      "hasTableStructure": false,
      "estimatedPages": 6
    },
    "processing": {
      "chunking": "recursive-character-text-splitter",
      "chunkSize": 800,
      "overlap": 200,
      "embeddingModel": "text-embedding-3-small",
      "embeddingDimensions": 1536
    },
    "metadata": {
      "contextAdded": true,
      "keywordExtraction": true,
      "languageDetection": true,
      "richMetadata": true
    }
  }
}
```

### 8️⃣ **Otimizações de Performance**

- ✅ Rate limiting para OpenAI API (150ms entre requests)
- ✅ Logging de progresso a cada 5 chunks
- ✅ Embedding do chunk contextual (não do chunk original)
- ✅ Armazenamento dual: `content` (original) + `content_with_context`

## 🎯 Como Testar

### 1. Fazer upload de um PDF
```bash
curl -X POST \
  http://localhost:3000/api/admin/agents/{agent-id}/knowledge/upload \
  -H "Cookie: nuxt-session=..." \
  -F "file=@Pixformance-Fitness-Brochure.pdf"
```

### 2. Verificar chunks no banco
```sql
SELECT
  id,
  title,
  LEFT(content, 100) as preview,
  metadata->'keywords' as keywords,
  metadata->'language' as language,
  metadata->'chunkIndex' as chunk_num,
  metadata->'totalChunks' as total_chunks
FROM knowledge_base
WHERE agent_config_id = 'xxx'
ORDER BY (metadata->>'chunkIndex')::int
LIMIT 5;
```

### 3. Testar busca híbrida
```sql
SELECT * FROM search_knowledge_hybrid(
  'agent-id'::uuid,
  '[0.1, 0.2, ...]'::vector(1536),  -- Query embedding
  ARRAY['required space', 'installation'],  -- Keywords
  10  -- Limit
);
```

## 📊 Comparação Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Chunking** | Simples por caracteres | RecursiveCharacterTextSplitter |
| **Chunk Size** | 1000 chars | 800 chars |
| **Overlap** | 200 (simples) | 200 (inteligente) |
| **Contexto** | ❌ Não | ✅ Sim (documento + posição) |
| **Keywords** | ❌ Não | ✅ Sim (extraídas automaticamente) |
| **Idioma** | ❌ Não | ✅ Detectado automaticamente |
| **Metadata** | Básica | Rica (15+ campos) |
| **Busca Híbrida** | ❌ Não | ✅ Sim (vetorial + keywords) |
| **Full-text Search** | ❌ Não | ✅ Sim (índice GIN) |

## 🔍 Por que o RAG vai funcionar melhor agora?

### 1. **Chunks mais inteligentes**
   - O RecursiveCharacterTextSplitter respeita quebras naturais do texto
   - Não corta frases no meio
   - Overlap inteligente mantém contexto entre chunks

### 2. **Contexto nos embeddings**
   - A IA sabe de qual documento veio a informação
   - A IA sabe a posição no documento
   - Embeddings mais precisos e contextuais

### 3. **Keywords ajudam na busca**
   - Busca híbrida: vetorial (semântica) + keywords (exata)
   - Termos técnicos como "1,60 m" são capturados como keywords
   - Boost automático para chunks com keywords relevantes

### 4. **Metadata rica permite filtragem**
   - Pode filtrar por idioma
   - Pode priorizar chunks com números (para perguntas técnicas)
   - Pode identificar chunks de tabelas

### 5. **Detecção de idioma**
   - Sistema multi-idioma automático
   - Embeddings levam em conta o idioma do documento

## 🚀 Próximos Passos Sugeridos

1. **Testar com documentos reais**
   - Fazer upload do PDF do Pixformance novamente
   - Testar perguntas como "qual o espaço necessário?"
   - Validar se os chunks estão corretos

2. **Implementar busca híbrida no chat**
   - Usar a função `search_knowledge_hybrid()` no chat
   - Combinar similaridade vetorial + keywords

3. **Adicionar cache de embeddings**
   - Evitar re-processar documentos já processados
   - Guardar hash do conteúdo

4. **Implementar rerank**
   - Após busca inicial, re-ordenar resultados
   - Usar modelo de rerank (Cohere, BGE, etc.)

## 🐛 Debugging

Se algo não funcionar:

```typescript
// Ver logs detalhados
console.log('Verificar logs no terminal do servidor')

// Ver chunks no banco
SELECT * FROM knowledge_base
WHERE agent_config_id = 'xxx'
ORDER BY created_at DESC
LIMIT 5;

// Ver metadata de um chunk
SELECT
  title,
  jsonb_pretty(metadata)
FROM knowledge_base
WHERE id = 'chunk-id';
```

## 📚 Referências

- [LangChain Text Splitters](https://js.langchain.com/docs/modules/data_connection/document_transformers/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [pgvector](https://github.com/pgvector/pgvector)
- [RAG Best Practices](https://www.anthropic.com/research/retrieval-augmented-generation)
