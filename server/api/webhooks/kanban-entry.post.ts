import { prisma } from '../../lib/prisma'
import { kanbanWebhookSchema } from '../../utils/validation'
import { handleWebhookEntry } from '../../services/kanban.service'
import { createLogger } from '../../utils/logger'

const logger = createLogger('webhook-kanban')

export default defineEventHandler(async (event) => {
  // Authenticate via API key (same pattern as existing webhooks)
  const apiKey = getHeader(event, 'x-api-key')
  if (!apiKey) {
    throw createError({ statusCode: 401, statusMessage: 'API key obrigatória' })
  }

  const client = await prisma.clients.findFirst({
    where: { api_key: apiKey }
  })
  if (!client) {
    throw createError({ statusCode: 401, statusMessage: 'API key inválida' })
  }

  const body = await readBody(event)
  const parsed = kanbanWebhookSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: parsed.error.flatten() })
  }

  logger.info({ agentId: parsed.data.agent_id, clientId: client.id }, 'Kanban webhook received')

  const card = await handleWebhookEntry({
    ...parsed.data,
    client_id: client.id
  })

  return { ok: true, data: { card_id: card.id } }
})
