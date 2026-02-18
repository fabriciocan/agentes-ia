import { prisma } from '../lib/prisma'
import { createLogger } from '../utils/logger'
import type { Conversation, Message, ConversationWithMessages, PaginatedResponse } from '../types'

const logger = createLogger('conversation')

export async function getOrCreateConversation(
  clientId: string,
  agentConfigId: string,
  userExternalId: string,
  channel: string,
  userName?: string
): Promise<Conversation> {
  // Ensure end_user exists
  const endUser = await prisma.end_users.upsert({
    where: {
      users_client_id_external_id_key: {
        client_id: clientId,
        external_id: userExternalId
      }
    },
    update: { name: userName || undefined },
    create: {
      client_id: clientId,
      external_id: userExternalId,
      name: userName || null,
      channel
    }
  })

  // Look for active conversation
  const existing = await prisma.conversations.findFirst({
    where: {
      client_id: clientId,
      agent_config_id: agentConfigId,
      user_id: endUser.id,
      status: 'active'
    },
    orderBy: { created_at: 'desc' }
  })

  if (existing) {
    return existing as unknown as Conversation
  }

  // Create new conversation
  const conversation = await prisma.conversations.create({
    data: {
      client_id: clientId,
      agent_config_id: agentConfigId,
      user_id: endUser.id
    }
  })

  logger.info({ conversationId: conversation.id }, 'New conversation created')
  return conversation as unknown as Conversation
}

export async function getConversationById(
  conversationId: string,
  clientId: string
): Promise<Conversation | null> {
  const conversation = await prisma.conversations.findFirst({
    where: { id: conversationId, client_id: clientId }
  })

  return (conversation as unknown as Conversation) || null
}

export async function addMessage(
  conversationId: string,
  role: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<Message> {
  const message = await prisma.messages.create({
    data: {
      conversation_id: conversationId,
      role,
      content,
      metadata: metadata || {}
    }
  })

  return message as unknown as Message
}

export async function getConversationHistory(
  conversationId: string,
  limit = 50
): Promise<Message[]> {
  const messages = await prisma.messages.findMany({
    where: { conversation_id: conversationId },
    orderBy: { created_at: 'asc' },
    take: limit
  })

  return messages as unknown as Message[]
}

export async function listConversations(
  clientId: string,
  options: {
    page?: number
    limit?: number
    status?: string
    channel?: string
    user_id?: string
    agent_config_id?: string
  }
): Promise<PaginatedResponse<ConversationWithMessages>> {
  const page = options.page || 1
  const limit = options.limit || 20
  const offset = (page - 1) * limit

  // Build where clause conditionally
  const where: Record<string, unknown> = { client_id: clientId }

  if (options.status) where.status = options.status
  if (options.user_id) where.user_id = options.user_id
  if (options.agent_config_id) where.agent_config_id = options.agent_config_id

  const [conversations, total] = await Promise.all([
    prisma.conversations.findMany({
      where,
      include: {
        end_users: {
          select: { name: true, external_id: true }
        },
        agent_configs: {
          select: { name: true }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updated_at: 'desc' },
      skip: offset,
      take: limit
    }),
    prisma.conversations.count({ where })
  ])

  const data = conversations.map((conv) => {
    const { end_users, agent_configs, _count, ...conversationData } = conv
    return {
      ...conversationData,
      user_name: end_users?.name || null,
      user_external_id: end_users?.external_id || null,
      agent_name: agent_configs?.name || null,
      message_count: _count.messages
    } as unknown as ConversationWithMessages
  })

  return {
    data,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit)
  }
}
