<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

interface Agent {
  id: string
  name: string
}

interface ChatSession {
  phone: string
  nomewpp: string
  message_count: number
  last_user_message: string
  last_bot_message: string
  last_message_at: string
  first_message_at: string
}

interface ChatMessageRow {
  id: string
  created_at: string
  phone: string
  nomewpp: string
  bot_message: string
  user_message: string
}

// Flattened message for display
interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// Agents list
const { data: agentsData } = await useFetch('/api/admin/agents')
const agents = computed<Agent[]>(() => {
  const raw = agentsData.value as { data: Agent[] } | null
  return raw?.data || []
})

// Selected agent
const selectedAgentId = ref<string | null>(null)
const selectedAgentName = computed(() => agents.value.find(a => a.id === selectedAgentId.value)?.name || '')

// Chat sessions (conversations)
const sessions = ref<ChatSession[]>([])
const loadingSessions = ref(true)

// Selected session messages
const selectedPhone = ref<string | null>(null)
const messages = ref<DisplayMessage[]>([])
const loadingMessages = ref(false)
const selectedSession = computed(() => sessions.value.find(s => s.phone === selectedPhone.value))

// Load all chat sessions
async function loadSessions() {
  loadingSessions.value = true
  try {
    const data = await $fetch('/api/admin/chat-messages')
    const result = data as { data: ChatSession[] }
    sessions.value = result.data
  } catch {
    sessions.value = []
  } finally {
    loadingSessions.value = false
  }
}

// Load messages for a specific phone session
async function selectSession(phone: string) {
  selectedPhone.value = phone
  loadingMessages.value = true
  try {
    const data = await $fetch('/api/admin/chat-messages', {
      params: { phone }
    })
    const result = data as { data: ChatMessageRow[] }

    // Flatten: each row has user_message + bot_message pair
    const flat: DisplayMessage[] = []
    for (const row of result.data) {
      if (row.user_message) {
        flat.push({
          id: row.id + '_user',
          role: 'user',
          content: row.user_message,
          created_at: row.created_at
        })
      }
      if (row.bot_message) {
        flat.push({
          id: row.id + '_bot',
          role: 'assistant',
          content: row.bot_message,
          created_at: row.created_at
        })
      }
    }
    messages.value = flat
  } catch {
    messages.value = []
  } finally {
    loadingMessages.value = false
  }
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Hoje'
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatRelativeDate(dateStr: string) {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`
}

// Extract a short session name from phone
function sessionName(phone: string) {
  // session_1770768103423_ewlxblh23 -> extract readable part
  if (phone.startsWith('session_')) {
    const parts = phone.split('_')
    if (parts.length >= 3) {
      return `Session ${parts[2]?.substring(0, 6) || ''}`
    }
  }
  // Phone number
  if (phone.match(/^\+?\d/)) {
    return phone
  }
  return phone.substring(0, 15)
}

// Group messages by date
function groupMessagesByDate(msgs: DisplayMessage[]) {
  const groups: { date: string; messages: DisplayMessage[] }[] = []
  let currentDate = ''

  for (const msg of msgs) {
    const date = formatDate(msg.created_at)
    if (date !== currentDate) {
      currentDate = date
      groups.push({ date, messages: [] })
    }
    groups[groups.length - 1]!.messages.push(msg)
  }

  return groups
}

// Auto-scroll to bottom
const chatContainer = ref<HTMLElement | null>(null)
watch(messages, async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
})

// Load sessions on mount
await loadSessions()
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-3rem)]">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 shrink-0">
      <div>
        <h1 class="text-2xl font-bold">
          Conversations
        </h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">
          View customer conversations and messages.
        </p>
      </div>
      <UBadge
        v-if="sessions.length > 0"
        :label="`${sessions.length} sessions`"
        variant="subtle"
        size="lg"
      />
    </div>

    <!-- Main 2-column layout -->
    <div class="flex-1 flex gap-4 min-h-0">
      <!-- Column 1: Sessions List -->
      <div class="w-80 shrink-0 flex flex-col">
        <UCard class="flex-1 flex flex-col overflow-hidden">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-message-square"
                  class="text-lg"
                />
                <span class="font-medium text-sm">Chats</span>
              </div>
              <UBadge
                v-if="sessions.length > 0"
                :label="String(sessions.length)"
                size="sm"
                variant="subtle"
              />
            </div>
          </template>
          <div class="flex-1 overflow-y-auto -mx-4 -my-4">
            <!-- Loading -->
            <div
              v-if="loadingSessions"
              class="flex items-center justify-center py-12"
            >
              <UIcon
                name="i-lucide-loader-2"
                class="text-2xl text-(--ui-text-muted) animate-spin"
              />
            </div>

            <!-- No sessions -->
            <div
              v-else-if="sessions.length === 0"
              class="flex flex-col items-center justify-center py-12 text-center px-4"
            >
              <UIcon
                name="i-lucide-message-square-off"
                class="text-2xl text-(--ui-text-dimmed) mb-2"
              />
              <p class="text-(--ui-text-muted) text-xs">
                No conversations yet.
              </p>
            </div>

            <!-- Sessions list -->
            <div v-else>
              <button
                v-for="session in sessions"
                :key="session.phone"
                :class="[
                  'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-(--ui-border)',
                  selectedPhone === session.phone
                    ? 'bg-(--ui-bg-accented)'
                    : 'hover:bg-(--ui-bg-elevated)'
                ]"
                @click="selectSession(session.phone)"
              >
                <UAvatar
                  :text="sessionName(session.phone).charAt(0).toUpperCase()"
                  size="sm"
                  class="shrink-0 mt-0.5"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-medium text-sm truncate">
                      {{ sessionName(session.phone) }}
                    </span>
                    <span class="text-[10px] text-(--ui-text-dimmed) shrink-0">
                      {{ formatRelativeDate(session.last_message_at) }}
                    </span>
                  </div>
                  <p class="text-xs text-(--ui-text-muted) truncate mt-0.5">
                    {{ session.last_user_message }}
                  </p>
                  <div class="flex items-center gap-2 mt-1">
                    <UBadge
                      :label="session.nomewpp || 'web'"
                      size="xs"
                      variant="subtle"
                      color="neutral"
                    />
                    <span class="text-[10px] text-(--ui-text-dimmed)">
                      {{ session.message_count }} msgs
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Column 2: Chat Messages (WhatsApp style) -->
      <div class="flex-1 flex flex-col min-w-0">
        <UCard class="flex-1 flex flex-col overflow-hidden">
          <!-- Chat Header -->
          <template #header>
            <div
              v-if="selectedSession"
              class="flex items-center gap-3"
            >
              <UAvatar
                :text="sessionName(selectedSession.phone).charAt(0).toUpperCase()"
                size="sm"
              />
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm truncate">
                  {{ sessionName(selectedSession.phone) }}
                </p>
                <div class="flex items-center gap-2">
                  <UBadge
                    :label="selectedSession.nomewpp || 'web'"
                    size="xs"
                    variant="subtle"
                    color="neutral"
                  />
                  <span class="text-xs text-(--ui-text-dimmed)">
                    {{ selectedSession.message_count }} messages
                  </span>
                  <span class="text-xs text-(--ui-text-dimmed)">
                    &middot; Started {{ formatRelativeDate(selectedSession.first_message_at) }}
                  </span>
                </div>
              </div>
            </div>
            <div
              v-else
              class="flex items-center gap-2"
            >
              <UIcon
                name="i-lucide-message-square"
                class="text-lg"
              />
              <span class="font-medium text-sm">Chat</span>
            </div>
          </template>

          <!-- Chat Body -->
          <div class="flex-1 overflow-hidden -mx-4 -my-4">
            <!-- Loading -->
            <div
              v-if="loadingMessages"
              class="flex items-center justify-center h-full"
            >
              <UIcon
                name="i-lucide-loader-2"
                class="text-3xl text-(--ui-text-muted) animate-spin"
              />
            </div>

            <!-- No conversation selected -->
            <div
              v-else-if="!selectedPhone"
              class="flex flex-col items-center justify-center h-full text-center px-8"
            >
              <div class="p-4 rounded-full bg-(--ui-bg-accented) mb-4">
                <UIcon
                  name="i-lucide-message-circle"
                  class="text-4xl text-(--ui-text-dimmed)"
                />
              </div>
              <p class="text-(--ui-text-muted) text-sm">
                Select a conversation to view messages.
              </p>
            </div>

            <!-- Messages -->
            <div
              v-else
              ref="chatContainer"
              class="h-full overflow-y-auto px-4 py-4"
              style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%239C92AC&quot; fill-opacity=&quot;0.03&quot;%3E%3Cpath d=&quot;M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"
            >
              <!-- No messages -->
              <div
                v-if="messages.length === 0"
                class="flex items-center justify-center h-full"
              >
                <p class="text-(--ui-text-muted) text-sm">
                  No messages in this conversation.
                </p>
              </div>

              <!-- Messages grouped by date -->
              <template
                v-for="group in groupMessagesByDate(messages)"
                :key="group.date"
              >
                <!-- Date separator -->
                <div class="flex items-center justify-center my-4">
                  <span class="px-3 py-1 text-[11px] rounded-full bg-(--ui-bg-elevated) text-(--ui-text-muted) shadow-sm">
                    {{ group.date }}
                  </span>
                </div>

                <!-- Messages -->
                <div
                  v-for="msg in group.messages"
                  :key="msg.id"
                  :class="[
                    'flex mb-2',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  ]"
                >
                  <div
                    :class="[
                      'max-w-[75%] px-3 py-2 rounded-2xl text-sm relative shadow-sm',
                      msg.role === 'user'
                        ? 'bg-(--ui-primary) text-white rounded-br-md'
                        : 'bg-(--ui-bg-elevated) text-(--ui-text) rounded-bl-md'
                    ]"
                  >
                    <!-- Role label for assistant -->
                    <p
                      v-if="msg.role === 'assistant'"
                      class="text-[10px] font-semibold text-(--ui-primary) mb-0.5"
                    >
                      AI Agent
                    </p>
                    <p class="whitespace-pre-wrap break-words leading-relaxed">
                      {{ msg.content }}
                    </p>
                    <p
                      :class="[
                        'text-[10px] mt-1 text-right',
                        msg.role === 'user' ? 'text-white/70' : 'text-(--ui-text-dimmed)'
                      ]"
                    >
                      {{ formatTime(msg.created_at) }}
                    </p>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
