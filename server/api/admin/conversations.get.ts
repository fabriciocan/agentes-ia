import { listConversations } from '../../services/conversation.service'
import { requirePermission } from '../../utils/authorization'

export default defineEventHandler(async (event) => {
  // Check permission (RBAC)
  if (event.context.can) {
    requirePermission(event, 'conversations.read')
  }

  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const queryParams = getQuery(event)

  return listConversations(adminUser.clientId, {
    page: queryParams.page ? Number(queryParams.page) : 1,
    limit: queryParams.limit ? Number(queryParams.limit) : 100,
    agent_config_id: queryParams.agent_config_id as string | undefined,
    status: queryParams.status as string | undefined
  })
})
