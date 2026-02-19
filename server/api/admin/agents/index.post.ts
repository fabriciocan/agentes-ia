import { agentConfigCreateSchema } from '../../../utils/validation'
import { createAgentConfig } from '../../../services/agent-config.service'
import { requirePermission } from '../../../utils/authorization'

export default defineEventHandler(async (event) => {
  requirePermission(event, 'agents.create')

  const user = event.context.user
  const adminUser = event.context.adminUser as unknown as { clientId?: string }

  // Get clientId from new user context or legacy adminUser
  const clientId = user?.client_id || adminUser?.clientId
  if (!clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const parsed = agentConfigCreateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  const config = await createAgentConfig(clientId, {
    ...parsed.data,
    company_id: user?.company_id || null
  })
  return { data: config }
})
