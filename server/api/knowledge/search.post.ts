import { generateEmbedding, cosineSimilarity } from '../../services/embedding.service'
import { prisma } from '../../lib/prisma'
import { createLogger } from '../../utils/logger'
import type { Client } from '../../types'

const logger = createLogger('knowledge-search')

interface KnowledgeEntryWithEmbedding {
  id: string
  title: string
  content: string
  content_type: string
  embedding: string | number[]
  chunk_index: number
}

export default defineEventHandler(async (event) => {
  const client = event.context.client as Client
  const body = await readBody(event)

  const { agent_config_id, query: searchQuery, limit = 5 } = body

  if (!agent_config_id || !searchQuery) {
    throw createError({ statusCode: 400, statusMessage: 'agent_config_id and query are required' })
  }

  // Verify agent belongs to this client
  const configExists = await prisma.agent_configs.findFirst({
    where: { id: agent_config_id, client_id: client.id },
    select: { id: true }
  })
  if (!configExists) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  // Generate embedding for the search query
  const queryEmbedding = await generateEmbedding(searchQuery)

  // Get all knowledge entries with embeddings (embedding column not in Prisma schema, use $queryRaw)
  const entries = await prisma.$queryRaw<KnowledgeEntryWithEmbedding[]>`
    SELECT id, title, content, content_type, embedding, chunk_index
    FROM knowledge_base
    WHERE agent_config_id = ${agent_config_id}::uuid AND embedding IS NOT NULL
  `

  // Rank by cosine similarity
  const results = entries
    .map(entry => {
      const embedding = (typeof entry.embedding === 'string' ? JSON.parse(entry.embedding) : entry.embedding) as number[]
      const similarity = cosineSimilarity(queryEmbedding, embedding)
      return {
        id: entry.id,
        title: entry.title,
        content: entry.content,
        content_type: entry.content_type,
        chunk_index: entry.chunk_index,
        similarity: Math.round(similarity * 1000) / 1000
      }
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.min(limit, 20))

  logger.info({ agentConfigId: agent_config_id, query: searchQuery.slice(0, 50), resultsCount: results.length }, 'Knowledge search')

  return { data: results }
})
