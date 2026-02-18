import { z } from 'zod'
import { getAgentConfig } from '../../../../../services/agent-config.service'
import { searchKnowledgeByEmbedding } from '../../../../../services/knowledge.service'
import { generateEmbedding } from '../../../../../services/embedding.service'

const searchSchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().int().min(1).max(20).optional().default(5)
})

export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const agentId = getRouterParam(event, 'id')
  if (!agentId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing agent id' })
  }

  const config = await getAgentConfig(agentId)
  if (!config || config.client_id !== adminUser.clientId) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  const body = await readBody(event)
  const parsed = searchSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  try {
    // Generate embedding for search query
    const queryEmbedding = await generateEmbedding(parsed.data.query)

    // Search knowledge base
    const results = await searchKnowledgeByEmbedding(agentId, queryEmbedding, parsed.data.limit)

    return { data: results }
  } catch (error) {
    const err = error as Error
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to search knowledge base'
    })
  }
})
