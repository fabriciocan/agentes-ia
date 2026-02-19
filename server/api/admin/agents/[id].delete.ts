import { deleteAgentConfig } from '../../../services/agent-config.service'
import { requirePermission } from '../../../utils/authorization'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'agents.delete')

  const user = event.context.user
  const adminUser = event.context.adminUser as unknown as { clientId?: string }
  const clientId = user?.client_id || adminUser?.clientId

  if (!clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const configId = getRouterParam(event, 'id')
  if (!configId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing agent id' })
  }

  const deleted = await deleteAgentConfig(configId, clientId)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  return { success: true }
})
