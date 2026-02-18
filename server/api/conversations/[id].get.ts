import { getConversationById, getConversationHistory } from '../../services/conversation.service'
import type { Client } from '../../types'

export default defineEventHandler(async (event) => {
  const client = event.context.client as Client
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing conversation ID' })
  }

  const conversation = await getConversationById(id, client.id)
  if (!conversation) {
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })
  }

  const messages = await getConversationHistory(conversation.id)

  return {
    ...conversation,
    messages
  }
})
