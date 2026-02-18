import { prisma } from '../lib/prisma'
import { qdrant, knowledgeCollectionName, ensureKnowledgeCollection } from '../lib/qdrant'
import { createLogger } from '../utils/logger'
import { generateEmbedding, chunkText } from './embedding.service'
import {
  extractKeywords,
  detectLanguage,
  hasNumericalData,
  hasTableStructure,
  estimatePages
} from '../utils/text-analysis'
import type { KnowledgeBase } from '../types'

const logger = createLogger('knowledge')

// Payload completo armazenado no Qdrant por ponto
interface QdrantPayload {
  agent_config_id: string
  title: string
  content: string
  content_type: string
  chunk_index: number
  total_chunks: number
  language: string
  keywords: string[]
  has_numbers: boolean
  has_table: boolean
  file_type: string | null
  file_size: number | null
  created_at: string
  [key: string]: unknown
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

    // Salva no PostgreSQL
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

    // Gera embedding e salva no Qdrant com payload completo
    const embedding = await generateEmbedding(data.content)
    await ensureKnowledgeCollection(agentConfigId)

    const payload: QdrantPayload = {
      agent_config_id: agentConfigId,
      title: data.title,
      content: data.content,
      content_type: data.content_type || 'text',
      chunk_index: 0,
      total_chunks: 1,
      language,
      keywords,
      has_numbers: hasNumericalData(data.content),
      has_table: hasTableStructure(data.content),
      file_type: data.file_type || null,
      file_size: data.file_size || null,
      created_at: entry.created_at.toISOString(),
    }

    await qdrant.upsert(knowledgeCollectionName(agentConfigId), {
      wait: true,
      points: [{ id: entry.id, vector: embedding, payload }]
    })

    logger.info({ agentConfigId, title: data.title }, 'Knowledge entry added to Postgres + Qdrant')
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
    const estimatedPages = estimatePages(content)
    const contentHasNumbers = hasNumericalData(content)
    const contentHasTable = hasTableStructure(content)

    logger.info(
      { agentConfigId, title, language, contentLength: content.length, keywordCount: globalKeywords.length },
      'Starting document processing'
    )

    const chunks = await chunkText(content, 800, 200)
    const entries: KnowledgeBase[] = []

    await ensureKnowledgeCollection(agentConfigId)

    logger.info({ agentConfigId, title, chunkCount: chunks.length }, 'Text chunked, generating embeddings')

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!
      const chunkTitle = `${title} - Parte ${i + 1}`

      // Conteúdo contextualizado para melhor embedding
      const contextualContent = `Document: ${title}\n\nPart ${i + 1}/${chunks.length}\n\n${chunk}`

      const chunkKeywords = extractKeywords(chunk)
      const allKeywords = [...new Set([...globalKeywords.slice(0, 10), ...chunkKeywords.slice(0, 5)])]

      const metadata = {
        ...additionalMetadata,
        chunkIndex: i,
        totalChunks: chunks.length,
        chunkSize: chunk.length,
        language,
        keywords: allKeywords,
        hasNumbers: contentHasNumbers,
        hasTable: contentHasTable,
        estimatedPages,
        processedAt: new Date().toISOString()
      }

      // Salva no PostgreSQL
      const entry = await prisma.knowledge_base.create({
        data: {
          agent_config_id: agentConfigId,
          title: chunkTitle,
          content: chunk,
          content_type: contentType,
          file_size: fileSize || null,
          file_type: fileType || null,
          chunk_index: i,
          metadata: metadata as any
        }
      })

      // Gera embedding do conteúdo contextualizado
      const embedding = await generateEmbedding(contextualContent)

      // Payload completo no Qdrant — tudo que o RAG precisa está aqui
      const payload: QdrantPayload = {
        agent_config_id: agentConfigId,
        title: chunkTitle,
        content: chunk,
        content_type: contentType,
        chunk_index: i,
        total_chunks: chunks.length,
        language,
        keywords: allKeywords,
        has_numbers: contentHasNumbers,
        has_table: contentHasTable,
        file_type: fileType || null,
        file_size: fileSize || null,
        created_at: entry.created_at.toISOString(),
      }

      await qdrant.upsert(knowledgeCollectionName(agentConfigId), {
        wait: true,
        points: [{ id: entry.id, vector: embedding, payload }]
      })

      entries.push(entry as unknown as KnowledgeBase)

      // Rate limiting OpenAI (500 req/min)
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150))
      }

      if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
        logger.debug({ agentConfigId, title, progress: `${i + 1}/${chunks.length}` }, 'Embedding progress')
      }
    }

    logger.info(
      { agentConfigId, title, chunkCount: chunks.length, language },
      'Knowledge chunks added to Postgres + Qdrant'
    )

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

  // Se conteúdo ou título mudou, atualiza embedding e payload no Qdrant
  if (data.content !== undefined || data.title !== undefined) {
    try {
      const newContent = data.content ?? existing.content
      const newTitle = data.title ?? existing.title
      const language = detectLanguage(newContent)
      const keywords = extractKeywords(newContent)

      const newEmbedding = await generateEmbedding(newContent)
      await ensureKnowledgeCollection(agentConfigId)

      const payload: QdrantPayload = {
        agent_config_id: agentConfigId,
        title: newTitle,
        content: newContent,
        content_type: (data.content_type ?? existing.content_type) as string,
        chunk_index: existing.chunk_index ?? 0,
        total_chunks: (existing.metadata as any)?.totalChunks ?? 1,
        language,
        keywords,
        has_numbers: hasNumericalData(newContent),
        has_table: hasTableStructure(newContent),
        file_type: existing.file_type,
        file_size: existing.file_size,
        created_at: existing.created_at.toISOString(),
      }

      await qdrant.upsert(knowledgeCollectionName(agentConfigId), {
        wait: true,
        points: [{ id: entryId, vector: newEmbedding, payload }]
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

  logger.info({ entryId, agentConfigId }, 'Knowledge entry deleted from Postgres + Qdrant')
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

    // Busca com payload completo — sem necessidade de segundo lookup no Postgres
    const searchResults = await qdrant.search(collectionName, {
      vector: queryEmbedding,
      limit,
      with_payload: true,
      filter: {
        must: [{ key: 'agent_config_id', match: { value: agentConfigId } }]
      }
    })

    if (searchResults.length === 0) return []

    const results = searchResults.map(r => {
      const p = r.payload as unknown as QdrantPayload
      return {
        id: r.id as string,
        agent_config_id: p.agent_config_id,
        title: p.title,
        content: p.content,
        content_type: p.content_type,
        chunk_index: p.chunk_index,
        file_type: p.file_type,
        file_size: p.file_size,
        metadata: {
          language: p.language,
          keywords: p.keywords,
          hasNumbers: p.has_numbers,
          hasTable: p.has_table,
          totalChunks: p.total_chunks,
        },
        created_at: new Date(p.created_at),
        updated_at: new Date(p.created_at),
        similarity: r.score,
      }
    })

    logger.debug(
      { agentConfigId, resultCount: results.length, topSimilarity: results[0]?.similarity },
      'Vector similarity search completed via Qdrant payload'
    )

    return results as unknown as Array<KnowledgeBase & { similarity: number }>
  } catch (error) {
    logger.error({ error, agentConfigId }, 'Vector similarity search failed')
    throw error
  }
}

