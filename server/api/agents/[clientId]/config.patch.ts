import { agentConfigUpdateSchema } from '../../../utils/validation'
import { updateAgentConfig } from '../../../services/agent-config.service'
import type { Client } from '../../../types'

export default defineEventHandler(async (event) => {
  const client = event.context.client as Client
  const clientId = getRouterParam(event, 'clientId')

  if (clientId !== client.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const { config_id, ...updates } = body

  if (!config_id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing config_id' })
  }

  const parsed = agentConfigUpdateSchema.safeParse(updates)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  const config = await updateAgentConfig(config_id, clientId, parsed.data)
  if (!config) {
    throw createError({ statusCode: 404, statusMessage: 'Config not found' })
  }

  return { data: config }
})
