import { getAgentConfigsByClient } from '../../../services/agent-config.service'
import type { Client } from '../../../types'

export default defineEventHandler(async (event) => {
  const client = event.context.client as Client
  const clientId = getRouterParam(event, 'clientId')

  if (clientId !== client.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const configs = await getAgentConfigsByClient(clientId)
  return { data: configs }
})
