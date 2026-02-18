import { knowledgeBaseCreateSchema } from '../../../../utils/validation'
import { getAgentConfig } from '../../../../services/agent-config.service'
import { addKnowledgeEntry } from '../../../../services/knowledge.service'

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
  const parsed = knowledgeBaseCreateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  const entry = await addKnowledgeEntry(agentId, parsed.data)
  return { data: entry }
})
