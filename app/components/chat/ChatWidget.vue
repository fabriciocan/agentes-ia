<script setup lang="ts">
const props = defineProps<{
  agentConfigId: string
  apiKey: string
  userExternalId?: string
  userName?: string
}>()

const { messages, loading, error, sendMessage } = useChat(props.agentConfigId, props.apiKey)
const chatContainer = ref<HTMLElement>()

const userId = props.userExternalId || `web-${Date.now()}`

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

watch(messages, scrollToBottom, { deep: true })

async function handleSend(message: string) {
  await sendMessage(message, userId, props.userName)
}
</script>

<template>
  <UCard class="flex flex-col h-full">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-message-circle"
          class="text-lg"
        />
        <span class="font-semibold">Chat</span>
      </div>
    </template>

    <div
      ref="chatContainer"
      class="flex-1 overflow-y-auto space-y-3 min-h-0 p-1"
    >
      <p
        v-if="messages.length === 0 && !loading"
        class="text-center text-muted text-sm py-8"
      >
        Send a message to start the conversation.
      </p>

      <ChatMessage
        v-for="msg in messages"
        :key="msg.id"
        :role="msg.role"
        :content="msg.content"
        :created-at="msg.created_at"
      />

      <TypingIndicator v-if="loading" />

      <p
        v-if="error"
        class="text-center text-red-500 text-sm"
      >
        {{ error }}
      </p>
    </div>

    <template #footer>
      <ChatInput
        :disabled="loading"
        @send="handleSend"
      />
    </template>
  </UCard>
</template>
