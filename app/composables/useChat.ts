import type { AgentMessageResponse } from '~~/server/types'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: Date
  pending?: boolean
}

export function useChat(agentConfigId: string, apiKey: string) {
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const conversationId = ref<string | null>(null)

  async function sendMessage(content: string, userExternalId: string, userName?: string) {
    error.value = null
    loading.value = true

    // Optimistic UI
    const tempId = `temp-${Date.now()}`
    messages.value.push({
      id: tempId,
      role: 'user',
      content,
      created_at: new Date()
    })

    try {
      const response = await $fetch<AgentMessageResponse>('/api/agents/message', {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
        body: {
          agent_config_id: agentConfigId,
          user_external_id: userExternalId,
          message: content,
          conversation_id: conversationId.value || undefined,
          user_name: userName
        }
      })

      conversationId.value = response.conversation_id

      messages.value.push({
        id: response.message.id,
        role: 'assistant',
        content: response.message.content,
        created_at: new Date(response.message.created_at)
      })
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to send message'
      // Remove optimistic message on error
      messages.value = messages.value.filter(m => m.id !== tempId)
    } finally {
      loading.value = false
    }
  }

  async function loadConversation(convId: string) {
    loading.value = true
    try {
      const response = await $fetch(`/api/conversations/${convId}`, {
        headers: { 'x-api-key': apiKey }
      })
      const data = response as { id: string; messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string }> }
      conversationId.value = data.id
      messages.value = data.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: new Date(m.created_at)
      }))
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load conversation'
    } finally {
      loading.value = false
    }
  }

  return {
    messages: readonly(messages),
    loading: readonly(loading),
    error: readonly(error),
    conversationId: readonly(conversationId),
    sendMessage,
    loadConversation
  }
}
