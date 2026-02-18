import { agentMessageSchema } from '../../utils/validation'
import { getAgentConfig } from '../../services/agent-config.service'
import { getOrCreateConversation, getConversationHistory, addMessage, getConversationById } from '../../services/conversation.service'
import { prisma } from '../../lib/prisma'
import type { Client } from '../../types'

export default defineEventHandler(async (event) => {
  const client = event.context.client as Client
  const body = await readBody(event)
  const parsed = agentMessageSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  const { agent_config_id, user_external_id, message, channel, conversation_id, user_name } = parsed.data

  // Load agent config
  const config = await getAgentConfig(agent_config_id)
  if (!config || config.client_id !== client.id) {
    throw createError({ statusCode: 404, statusMessage: 'Agent config not found' })
  }
  if (!config.is_active) {
    throw createError({ statusCode: 403, statusMessage: 'Agent is not active' })
  }

  // Get or create conversation
  let conversation
  if (conversation_id) {
    conversation = await getConversationById(conversation_id, client.id)
    if (!conversation) {
      throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })
    }
  } else {
    conversation = await getOrCreateConversation(
      client.id, agent_config_id, user_external_id, channel || 'web', user_name
    )
  }

  // Save user message
  const userMsg = await addMessage(conversation.id, 'user', message)

  // Load history
  const history = await getConversationHistory(conversation.id)

  // Load knowledge base entries
  const kbEntries = await prisma.knowledge_base.findMany({
    where: { agent_config_id },
    select: { title: true, content: true }
  })

  return {
    conversation_id: conversation.id,
    message: {
      id: userMsg.id,
      role: 'user',
      content: message,
      created_at: userMsg.created_at
    },
    agent: {
      name: config.name,
      system_prompt: config.system_prompt,
      personality: config.personality,
      tone: config.tone,
      language: config.language
    },
    history: history.map(m => ({ role: m.role, content: m.content })),
    knowledge_base: kbEntries.map(kb => ({ title: kb.title, content: kb.content }))
  }
})
