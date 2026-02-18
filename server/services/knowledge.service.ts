import { prisma } from '../lib/prisma'
import { qdrant, knowledgeCollectionName, ensureKnowledgeCollection } from '../lib/qdrant'
import { createLogger } from '../utils/logger'
import { generateEmbedding, generateEmbeddings, chunkText } from './embedding.service'
import {
  extractKeywords,
  detectLanguage,
  hasNumericalData,
  hasTableStructure,
  estimatePages
} from '../utils/text-analysis'
import type { KnowledgeBase } from '../types'

const logger = createLogger('knowledge')

// Gera vetor esparso compatível com o N8N "Build Dense + Sparse Vectors"
// Usa o mesmo hash djb2 e vocabulário de 30k tokens
function buildSparseVector(text: string): { indices: number[]; values: number[] } {
  const stopwords = new Set([
    'the','and','for','are','but','not','you','all','can','her','was','one','our',
    'out','day','get','has','him','his','how','its','may','new','now','old','see',
    'two','who','boy','did','man','men','put','say','she','too','use','way',
    'com','que','uma','para','por','mas','seu','sua','não','como','mais','isso',
    'esse','esta','pelo','pela','dos','das','nos','nas','este','qual','quando',
    'entre','sobre','após','antes','onde'
  ])

  const words = text.toLowerCase()
    .replace(/[^a-záéíóúãõàâêîôûçüñ\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !stopwords.has(w))

  const freq: Record<string, number> = {}
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1
  }

  // Agrupa colisões de hash somando valores
  const combined: Record<number, number> = {}
  for (const [word, count] of Object.entries(freq)) {
    let hash = 0
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(i)
      hash = hash & 0x7FFFFFFF
    }
    const idx = hash % 30000
    combined[idx] = (combined[idx] || 0) + count / Math.max(words.length, 1)
  }

  const indices = Object.keys(combined).map(Number)
  const values = indices.map(idx => combined[idx]!)
  return { indices, values }
}

// Payload salvo no Qdrant — estrutura compatível com o N8N RAG workflow
interface QdrantPayload {
  // Campos top-level (usados pelo N8N diretamente)
  agent_config_id: string
  title: string
  content: string
  content_type: string
  // Metadata aninhada (o N8N lê: point.payload.metadata.chunkIndex, etc.)
  metadata: {
    chunkIndex: number
    totalChunks: number
    keywords: string[]
    language: string
    hasNumbers: boolean
    hasTable: boolean
    estimatedPages: number
    fileType: string | null
    fileSize: number | null
    createdAt: string
  }
  [key: string]: unknown
}

function buildPayload(params: {
  agentConfigId: string
  title: string
  content: string
  contentType: string
  chunkIndex: number
  totalChunks: number
  language: string
  keywords: string[]
  hasNumbers: boolean
  hasTable: boolean
  estimatedPages: number
  fileType?: string | null
  fileSize?: number | null
  createdAt: string
}): QdrantPayload {
  return {
    agent_config_id: params.agentConfigId,
    title: params.title,
    content: params.content,
    content_type: params.contentType,
    metadata: {
      chunkIndex: params.chunkIndex,
      totalChunks: params.totalChunks,
      keywords: params.keywords,
      language: params.language,
      hasNumbers: params.hasNumbers,
      hasTable: params.hasTable,
      estimatedPages: params.estimatedPages,
      fileType: params.fileType || null,
      fileSize: params.fileSize || null,
      createdAt: params.createdAt,
    },
  }
}

export async function getKnowledgeEntries(agentConfigId: string): Promise<KnowledgeBase[]> {
  const result = await prisma.knowledge_base.findMany({
    where: { agent_config_id: agentConfigId },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      agent_config_id: true,
      title: true,
      content: true,
      content_type: true,
      metadata: true,
      file_size: true,
      file_type: true,
      chunk_index: true,
      created_at: true,
      updated_at: true
    }
  })
  return result as unknown as KnowledgeBase[]
}

export async function addKnowledgeEntry(
  agentConfigId: string,
  data: { title: string; content: string; content_type: string; file_size?: number; file_type?: string }
): Promise<KnowledgeBase> {
  try {
    const language = detectLanguage(data.content)
    const keywords = extractKeywords(data.content)
    const pages = estimatePages(data.content)

    const entry = await prisma.knowledge_base.create({
      data: {
        agent_config_id: agentConfigId,
        title: data.title,
        content: data.content,
        content_type: data.content_type || 'text',
        file_size: data.file_size || null,
        file_type: data.file_type || null,
        chunk_index: 0,
        metadata: { language, keywords, totalChunks: 1, processedAt: new Date().toISOString() }
      }
    })

    await ensureKnowledgeCollection(agentConfigId)
    const embedding = await generateEmbedding(data.content)
    const sparse = buildSparseVector(data.content)

    const payload = buildPayload({
      agentConfigId,
      title: data.title,
      content: data.content,
      contentType: data.content_type || 'text',
      chunkIndex: 0,
      totalChunks: 1,
      language,
      keywords,
      hasNumbers: hasNumericalData(data.content),
      hasTable: hasTableStructure(data.content),
      estimatedPages: pages,
      fileType: data.file_type,
      fileSize: data.file_size,
      createdAt: entry.created_at.toISOString(),
    })

    await qdrant.upsert(knowledgeCollectionName(agentConfigId), {
      wait: true,
      points: [{
        id: entry.id,
        vector: { dense: embedding, sparse },
        payload,
      }]
    })

    logger.info({ agentConfigId, title: data.title }, 'Knowledge entry added')
    return entry as unknown as KnowledgeBase
  } catch (error) {
    logger.error({ error, agentConfigId }, 'Failed to add knowledge entry')
    throw error
  }
}

export async function addKnowledgeChunks(
  agentConfigId: string,
  title: string,
  content: string,
  contentType: string,
  fileSize?: number,
  fileType?: string,
  additionalMetadata?: Record<string, any>
): Promise<KnowledgeBase[]> {
  try {
    const language = detectLanguage(content)
    const globalKeywords = extractKeywords(content)
    const pages = estimatePages(content)
    const contentHasNumbers = hasNumericalData(content)
    const contentHasTable = hasTableStructure(content)

    logger.info({ agentConfigId, title, language, contentLength: content.length }, 'Starting document processing')

    const chunks = await chunkText(content, 800, 200)
    const entries: KnowledgeBase[] = []

    await ensureKnowledgeCollection(agentConfigId)

    logger.info({ agentConfigId, title, chunkCount: chunks.length }, 'Chunked — generating embeddings (batch)')

    // 1. Pre-compute per-chunk data
    const chunkData = chunks.map((chunk, i) => {
      const chunkTitle = chunks.length === 1 ? title : `${title} - Parte ${i + 1}`
      const contextualContent = `Document: ${title}\n\nPart ${i + 1}/${chunks.length}\n\n${chunk}`
      const chunkKeywords = extractKeywords(chunk)
      const allKeywords = [...new Set([...globalKeywords.slice(0, 10), ...chunkKeywords.slice(0, 5)])]
      return { chunk, chunkTitle, contextualContent, allKeywords }
    })

    // 2. Save all chunks to Postgres
    const dbEntries = await Promise.all(
      chunkData.map((d, i) =>
        prisma.knowledge_base.create({
          data: {
            agent_config_id: agentConfigId,
            title: d.chunkTitle,
            content: d.chunk,
            content_type: contentType,
            file_size: fileSize || null,
            file_type: fileType || null,
            chunk_index: i,
            metadata: {
              ...additionalMetadata,
              chunkIndex: i,
              totalChunks: chunks.length,
              chunkSize: d.chunk.length,
              language,
              keywords: d.allKeywords,
              hasNumbers: contentHasNumbers,
              hasTable: contentHasTable,
              estimatedPages: pages,
              processedAt: new Date().toISOString()
            } as any
          }
        })
      )
    )

    // 3. Batch generate all embeddings in a single OpenAI API call
    const embeddings = await generateEmbeddings(chunkData.map(d => d.contextualContent))

    // 4. Batch upsert all points to Qdrant in a single request (dense + sparse)
    await qdrant.upsert(knowledgeCollectionName(agentConfigId), {
      wait: true,
      points: dbEntries.map((entry: { id: string; created_at: Date }, i: number) => ({
        id: entry.id,
        vector: { dense: embeddings[i]!, sparse: buildSparseVector(chunkData[i]!.chunk) },
        payload: buildPayload({
          agentConfigId,
          title: chunkData[i]!.chunkTitle,
          content: chunkData[i]!.chunk,
          contentType,
          chunkIndex: i,
          totalChunks: chunks.length,
          language,
          keywords: chunkData[i]!.allKeywords,
          hasNumbers: contentHasNumbers,
          hasTable: contentHasTable,
          estimatedPages: pages,
          fileType: fileType,
          fileSize: fileSize,
          createdAt: entry.created_at.toISOString(),
        }),
      }))
    })

    dbEntries.forEach((e: unknown) => entries.push(e as unknown as KnowledgeBase))

    logger.info({ agentConfigId, title, chunkCount: chunks.length, language }, 'Chunks saved to Postgres + Qdrant')
    return entries
  } catch (error) {
    logger.error({ error, agentConfigId, title }, 'Failed to add knowledge chunks')
    throw error
  }
}

export async function updateKnowledgeEntry(
  entryId: string,
  agentConfigId: string,
  data: { title?: string; content?: string; content_type?: string }
): Promise<KnowledgeBase | null> {
  const existing = await prisma.knowledge_base.findFirst({
    where: { id: entryId, agent_config_id: agentConfigId }
  })
  if (!existing) return null

  const updated = await prisma.knowledge_base.update({
    where: { id: entryId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.content_type !== undefined && { content_type: data.content_type }),
    }
  })

  if (data.content !== undefined || data.title !== undefined) {
    try {
      const newContent = data.content ?? existing.content
      const newTitle = data.title ?? existing.title
      const language = detectLanguage(newContent)
      const keywords = extractKeywords(newContent)
      const existingMeta = (existing.metadata as any) || {}

      const embedding = await generateEmbedding(newContent)
      await ensureKnowledgeCollection(agentConfigId)

      const payload = buildPayload({
        agentConfigId,
        title: newTitle,
        content: newContent,
        contentType: (data.content_type ?? existing.content_type) as string,
        chunkIndex: existing.chunk_index ?? 0,
        totalChunks: existingMeta.totalChunks ?? 1,
        language,
        keywords,
        hasNumbers: hasNumericalData(newContent),
        hasTable: hasTableStructure(newContent),
        estimatedPages: estimatePages(newContent),
        fileType: existing.file_type,
        fileSize: existing.file_size,
        createdAt: existing.created_at.toISOString(),
      })

      await qdrant.upsert(knowledgeCollectionName(agentConfigId), {
        wait: true,
        points: [{ id: entryId, vector: { dense: embedding, sparse: buildSparseVector(newContent) }, payload }]
      })
    } catch (error) {
      logger.warn({ error, entryId }, 'Failed to update Qdrant on knowledge update')
    }
  }

  logger.info({ entryId, agentConfigId }, 'Knowledge entry updated')
  return updated as unknown as KnowledgeBase
}

export async function deleteKnowledgeEntry(
  entryId: string,
  agentConfigId: string
): Promise<boolean> {
  const deleted = await prisma.knowledge_base.deleteMany({
    where: { id: entryId, agent_config_id: agentConfigId }
  })
  if (deleted.count === 0) return false

  try {
    await qdrant.delete(knowledgeCollectionName(agentConfigId), {
      wait: true,
      points: [entryId]
    })
  } catch (_) {}

  logger.info({ entryId, agentConfigId }, 'Knowledge entry deleted')
  return true
}

export async function searchKnowledgeByEmbedding(
  agentConfigId: string,
  queryEmbedding: number[],
  limit = 5
): Promise<Array<KnowledgeBase & { similarity: number }>> {
  try {
    const collectionName = knowledgeCollectionName(agentConfigId)
    const { collections } = await qdrant.getCollections()
    if (!collections.some(c => c.name === collectionName)) return []

    const searchResults = await qdrant.query(collectionName, {
      query: queryEmbedding,
      using: 'dense',
      limit,
      with_payload: true,
      filter: {
        must: [{ key: 'agent_config_id', match: { value: agentConfigId } }]
      }
    })

    if (!searchResults.points || searchResults.points.length === 0) return []

    const results = searchResults.points.map(r => {
      const p = r.payload as unknown as QdrantPayload
      return {
        id: r.id as string,
        agent_config_id: p.agent_config_id,
        title: p.title,
        content: p.content,
        content_type: p.content_type,
        chunk_index: p.metadata.chunkIndex,
        file_type: p.metadata.fileType,
        file_size: p.metadata.fileSize,
        metadata: p.metadata,
        created_at: new Date(p.metadata.createdAt),
        updated_at: new Date(p.metadata.createdAt),
        similarity: r.score,
      }
    })

    logger.debug({ agentConfigId, resultCount: results.length, topSimilarity: results[0]?.similarity }, 'RAG search done')
    return results as unknown as Array<KnowledgeBase & { similarity: number }>
  } catch (error) {
    logger.error({ error, agentConfigId }, 'Vector similarity search failed')
    throw error
  }
}
