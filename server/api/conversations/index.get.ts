import { conversationListQuerySchema } from '../../utils/validation'
import { listConversations } from '../../services/conversation.service'
import type { Client } from '../../types'

export default defineEventHandler(async (event) => {
  const client = event.context.client as Client
  const queryParams = getQuery(event)

  const parsed = conversationListQuerySchema.safeParse(queryParams)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query params', data: parsed.error.flatten() })
  }

  return listConversations(client.id, parsed.data)
})
