import { agentConfigUpdateSchema } from '../../../utils/validation'
import { updateAgentConfig } from '../../../services/agent-config.service'
import { requirePermission } from '../../../utils/authorization'

/**
 * PATCH /api/admin/agents/:id
 *
 * Updates an agent configuration scoped to the current user's company.
 * Requires: agents.update permission (falls back to agents.create for legacy)
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'agents.update')

  const configId = getRouterParam(event, 'id')
  if (!configId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing agent id' })
  }

  const user = event.context.user
  const adminUser = event.context.adminUser as unknown as { clientId?: string }
  const clientId = user?.client_id || adminUser?.clientId

  if (!clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const parsed = agentConfigUpdateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  const config = await updateAgentConfig(configId, clientId, parsed.data)
  if (!config) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found or access denied' })
  }

  return { data: config }
})
