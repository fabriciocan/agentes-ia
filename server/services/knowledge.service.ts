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
    // Generate embedding for the content
    const embedding = await generateEmbedding(data.content)

    // Create record in PostgreSQL
    const entry = await prisma.knowledge_base.create({
      data: {
        agent_config_id: agentConfigId,
        title: data.title,
        content: data.content,
        content_type: data.content_type || 'text',
        file_size: data.file_size || null,
        file_type: data.file_type || null,
        metadata: {}
      }
    })

    // Ensure Qdrant collection exists and upsert the vector
    await ensureKnowledgeCollection(agentConfigId)
    await qdrant.upsert(knowledgeCollectionName(agentConfigId), {
      wait: true,
      points: [{
        id: entry.id,
        vector: embedding,
        payload: { agent_config_id: agentConfigId, title: data.title }
      }]
    })

    logger.info({ agentConfigId, title: data.title, hasEmbedding: true }, 'Knowledge entry added with embedding')
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
    // Detect language and extract global keywords from full content
    const language = detectLanguage(content)
    const globalKeywords = extractKeywords(content)

    logger.info(
      {
        agentConfigId,
        title,
        language,
        contentLength: content.length,
        keywordCount: globalKeywords.length
      },
      'Starting document processing'
    )

    // Chunk large documents with optimized settings
    const chunks = await chunkText(content, 800, 200)
    const entries: KnowledgeBase[] = []

    logger.info({ agentConfigId, title, chunkCount: chunks.length }, 'Text chunked, generating embeddings')

    // Ensure Qdrant collection exists before processing chunks
    await ensureKnowledgeCollection(agentConfigId)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!

      // Add context to chunk for better embedding
      const contextualContent = `Document: ${title}\n\nPart ${i + 1}/${chunks.length}\n\n${chunk}`

      // Extract keywords from this specific chunk
      const chunkKeywords = extractKeywords(chunk)

      // Combine global and chunk-specific keywords (deduplicated)
      const allKeywords = [...new Set([...globalKeywords.slice(0, 10), ...chunkKeywords.slice(0, 5)])]

      // Build rich metadata
      const metadata = {
        ...additionalMetadata,
        chunkIndex: i,
        totalChunks: chunks.length,
        chunkSize: chunk.length,
        contextualChunkSize: contextualContent.length,
        keywords: allKeywords,
        language,
        hasNumbers: hasNumericalData(chunk),
        hasTable: hasTableStructure(chunk),
        estimatedPages: estimatePages(content),
        processedAt: new Date().toISOString()
      }

      // Create record in PostgreSQL
      const entry = await prisma.knowledge_base.create({
        data: {
          agent_config_id: agentConfigId,
          title: `${title} - Parte ${i + 1}`,
          content: chunk,
          content_type: contentType,
          file_size: fileSize || null,
          file_type: fileType || null,
          chunk_index: i,
          metadata: metadata as any
        }
      })

      // Generate embedding for contextual content
      const embedding = await generateEmbedding(contextualContent)

      // Upsert to Qdrant with the same UUID as the PG record
      await qdrant.upsert(knowledgeCollectionName(agentConfigId), {
        wait: true,
        points: [{
          id: entry.id,
          vector: embedding,
          payload: { agent_config_id: agentConfigId, title: `${title} - Parte ${i + 1}` }
        }]
      })

      entries.push(entry as unknown as KnowledgeBase)

      // Rate limiting for OpenAI API (500 req/min = ~120ms between requests)
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150))
      }

      // Log progress every 5 chunks
      if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
        logger.debug(
          { agentConfigId, title, progress: `${i + 1}/${chunks.length}` },
          'Embedding progress'
        )
      }
    }

    logger.info(
      {
        agentConfigId,
        title,
        chunkCount: chunks.length,
        avgChunkSize: Math.round(content.length / chunks.length),
        language,
        totalKeywords: globalKeywords.length
      },
      'Knowledge entry added with enhanced chunking and embeddings'
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
  // First verify ownership
  const existing = await prisma.knowledge_base.findFirst({
    where: { id: entryId, agent_config_id: agentConfigId }
  })
  if (!existing) return null

  // Update PG
  const updated = await prisma.knowledge_base.update({
    where: { id: entryId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.content_type !== undefined && { content_type: data.content_type }),
    }
  })

  // If content changed, update Qdrant vector
  if (data.content !== undefined) {
    try {
      const newEmbedding = await generateEmbedding(data.content)
      await ensureKnowledgeCollection(agentConfigId)
      await qdrant.upsert(knowledgeCollectionName(agentConfigId), {
        wait: true,
        points: [{
          id: entryId,
          vector: newEmbedding,
          payload: { agent_config_id: agentConfigId, title: updated.title }
        }]
      })
    } catch (error) {
      logger.warn({ error, entryId }, 'Failed to regenerate embedding on update')
    }
  }

  logger.info({ entryId, agentConfigId }, 'Knowledge entry updated')
  return updated as unknown as KnowledgeBase
}

export async function deleteKnowledgeEntry(
  entryId: string,
  agentConfigId: string
): Promise<boolean> {
  // Delete from PG
  const deleted = await prisma.knowledge_base.deleteMany({
    where: { id: entryId, agent_config_id: agentConfigId }
  })
  if (deleted.count === 0) return false

  // Delete from Qdrant (ignore errors if collection doesn't exist)
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

    // Check collection exists
    const { collections } = await qdrant.getCollections()
    if (!collections.some(c => c.name === collectionName)) return []

    // Search in Qdrant
    const searchResults = await qdrant.search(collectionName, {
      vector: queryEmbedding,
      limit,
      with_payload: false,
    })

    if (searchResults.length === 0) return []

    // Fetch metadata from PG
    const ids = searchResults.map(r => r.id as string)
    const entries = await prisma.knowledge_base.findMany({
      where: { id: { in: ids } },
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

    // Reorder by Qdrant score and add similarity
    const scoreMap = new Map(searchResults.map(r => [r.id as string, r.score]))
    const results = entries
      .sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0))
      .map(entry => ({ ...entry, similarity: scoreMap.get(entry.id) || 0 }))

    logger.debug(
      {
        agentConfigId,
        resultCount: results.length,
        topSimilarity: results[0]?.similarity
      },
      'Vector similarity search completed'
    )

    return results as unknown as Array<KnowledgeBase & { similarity: number }>
  } catch (error) {
    logger.error({ error, agentConfigId }, 'Vector similarity search failed')
    throw error
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i]! * vecB[i]!
    normA += vecA[i]! * vecA[i]!
    normB += vecB[i]! * vecB[i]!
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}
