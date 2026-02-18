import { deleteAgentConfig } from '../../../services/agent-config.service'
import { requirePermission } from '../../../utils/authorization'

export default defineEventHandler(async (event) => {
  // Check permission (RBAC)
  if (event.context.can) {
    requirePermission(event, 'agents.delete')
  }

  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const configId = getRouterParam(event, 'id')
  if (!configId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing agent id' })
  }

  const deleted = await deleteAgentConfig(configId, adminUser.clientId)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  return { success: true }
})
