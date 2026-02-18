import { prisma } from '../../lib/prisma'

export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const clientId = adminUser.clientId

  const [totalAgents, activeConversations, totalMessages, knowledgeItems] = await Promise.all([
    prisma.agent_configs.count({ where: { client_id: clientId } }),
    prisma.conversations.count({ where: { client_id: clientId } }),
    prisma.messages.count({
      where: {
        conversations: {
          client_id: clientId
        }
      }
    }),
    prisma.knowledge_base.count({
      where: {
        agent_configs: {
          client_id: clientId
        }
      }
    })
  ])

  return {
    totalAgents,
    activeConversations,
    totalMessages,
    knowledgeItems
  }
})
