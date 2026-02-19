import { getAgentConfig } from '../../../../../../services/agent-config.service'
import { deleteKnowledgeFile } from '../../../../../../services/knowledge.service'
import { requirePermission } from '../../../../../../utils/authorization'

export default defineEventHandler(async (event) => {
  if (event.context.can) {
    requirePermission(event, 'knowledge.delete')
  }

  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const agentId = getRouterParam(event, 'id')
  const fileId = getRouterParam(event, 'fileId')
  if (!agentId || !fileId) {
    throw createError({ statusCode: 400, statusMessage: 'Parâmetros ausentes' })
  }

  const config = await getAgentConfig(agentId)
  if (!config || config.client_id !== adminUser.clientId) {
    throw createError({ statusCode: 404, statusMessage: 'Agente não encontrado' })
  }

  const deleted = await deleteKnowledgeFile(fileId, agentId)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Arquivo de conhecimento não encontrado' })
  }

  return { success: true }
})
