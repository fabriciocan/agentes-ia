import { agentConfigCreateSchema } from '../../../utils/validation'
import { createAgentConfig } from '../../../services/agent-config.service'
import { requirePermission } from '../../../utils/authorization'

export default defineEventHandler(async (event) => {
  // Check permission (RBAC)
  if (event.context.can) {
    requirePermission(event, 'agents.create')
  }

  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const parsed = agentConfigCreateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  const config = await createAgentConfig(adminUser.clientId, parsed.data)
  return { data: config }
})
