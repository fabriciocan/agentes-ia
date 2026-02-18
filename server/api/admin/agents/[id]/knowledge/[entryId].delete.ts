import { getAgentConfig } from '../../../../../services/agent-config.service'
import { deleteKnowledgeEntry } from '../../../../../services/knowledge.service'

export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const agentId = getRouterParam(event, 'id')
  const entryId = getRouterParam(event, 'entryId')
  if (!agentId || !entryId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing parameters' })
  }

  const config = await getAgentConfig(agentId)
  if (!config || config.client_id !== adminUser.clientId) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  const deleted = await deleteKnowledgeEntry(entryId, agentId)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Knowledge entry not found' })
  }

  return { success: true }
})
