import { getAgentConfigsByClient } from '../../services/agent-config.service'
import { requirePermission } from '../../utils/authorization'

export default defineEventHandler(async (event) => {
  // Check permission (RBAC)
  if (event.context.can) {
    requirePermission(event, 'agents.read')
  }

  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const configs = await getAgentConfigsByClient(adminUser.clientId)
  return { data: configs }
})
