import { generateEmbedding } from '../../services/embedding.service'
import { searchKnowledgeByEmbedding } from '../../services/knowledge.service'
import { prisma } from '../../lib/prisma'
import { createLogger } from '../../utils/logger'
import type { Client } from '../../types'

const logger = createLogger('knowledge-search')

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

  // Generate embedding and search via Qdrant
  const queryEmbedding = await generateEmbedding(searchQuery)
  const results = await searchKnowledgeByEmbedding(agent_config_id, queryEmbedding, Math.min(limit, 20))

  const data = results.map(r => ({
    id: r.id,
    title: r.title,
    content: r.content,
    content_type: r.content_type,
    chunk_index: r.chunk_index,
    similarity: Math.round(r.similarity * 1000) / 1000
  }))

  logger.info({ agentConfigId: agent_config_id, query: searchQuery.slice(0, 50), resultsCount: data.length }, 'Knowledge search via Qdrant')

  return { data }
})
