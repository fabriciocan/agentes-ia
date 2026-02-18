import { getConversationById, getConversationHistory } from '../../../services/conversation.service'

export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing conversation ID' })
  }

  const conversation = await getConversationById(id, adminUser.clientId)
  if (!conversation) {
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })
  }

  const messages = await getConversationHistory(conversation.id, 200)

  return {
    ...conversation,
    messages
  }
})
