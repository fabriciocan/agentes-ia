<script setup lang="ts">
interface KanbanCardData {
  id: string
  title: string
  client_name: string
  client_phone?: string
  client_email?: string
  notes?: string
  tags?: string[]
  source?: 'manual' | 'n8n' | 'webhook'
  entered_at?: string
  end_user?: string
  conversation?: {
    id: string
    status?: string
    created_at?: string
  }
  column_id: string
  moves?: Array<{ from_column: string; to_column: string; moved_at: string }>
}

const props = defineProps<{
  card: KanbanCardData
  isEntryColumn: boolean
}>()

const emit = defineEmits<{
  move: [cardId: string]
  click: [card: KanbanCardData]
  'open-conversation': [conversation: KanbanCardData['conversation']]
}>()

function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min atrás`
  if (diffHr < 24) return `${diffHr}h atrás`
  if (diffDay < 7) return `${diffDay}d atrás`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const sourceBadgeProps = computed(() => {
  switch (props.card.source) {
    case 'n8n':
      return { color: 'primary' as const, label: 'n8n' }
    case 'webhook':
      return { color: 'success' as const, label: 'webhook' }
    default:
      return { color: 'neutral' as const, label: 'manual' }
  }
})

function onDragStart(event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', props.card.id)
  }
  emit('move', props.card.id)
}

function onConversationClick(event: MouseEvent) {
  event.stopPropagation()
  emit('open-conversation', props.card.conversation)
}
</script>

<template>
  <div
    draggable="true"
    class="group bg-(--ui-bg) border border-(--ui-border) rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md hover:border-(--ui-border-accented) transition-all duration-150 select-none"
    @dragstart="onDragStart"
    @click="emit('click', card)"
  >
    <!-- Header: client name + conversation icon -->
    <div class="flex items-start justify-between gap-2 mb-2">
      <p class="font-medium text-sm text-(--ui-text-highlighted) leading-snug line-clamp-2 flex-1">
        {{ card.client_name || card.title || 'Sem nome' }}
      </p>
      <button
        v-if="card.conversation"
        class="shrink-0 p-1 rounded hover:bg-(--ui-bg-accented) text-(--ui-text-muted) hover:text-(--ui-primary) transition-colors"
        title="Ver conversa"
        @click="onConversationClick"
      >
        <UIcon name="i-lucide-message-circle" class="text-base" />
      </button>
    </div>

    <!-- Contact info -->
    <div class="space-y-1 mb-2">
      <div v-if="card.client_phone" class="flex items-center gap-1.5">
        <UIcon name="i-lucide-phone" class="text-xs text-(--ui-text-dimmed) shrink-0" />
        <span class="text-xs text-(--ui-text-muted) truncate">{{ card.client_phone }}</span>
      </div>
      <div v-if="card.client_email" class="flex items-center gap-1.5">
        <UIcon name="i-lucide-mail" class="text-xs text-(--ui-text-dimmed) shrink-0" />
        <span class="text-xs text-(--ui-text-muted) truncate">{{ card.client_email }}</span>
      </div>
    </div>

    <!-- Tags -->
    <div v-if="card.tags && card.tags.length > 0" class="flex flex-wrap gap-1 mb-2">
      <span
        v-for="tag in card.tags.slice(0, 3)"
        :key="tag"
        class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-(--ui-bg-accented) text-(--ui-text-muted)"
      >
        {{ tag }}
      </span>
      <span
        v-if="card.tags.length > 3"
        class="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-(--ui-text-dimmed)"
      >
        +{{ card.tags.length - 3 }}
      </span>
    </div>

    <!-- Footer: source badge + date -->
    <div class="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-(--ui-border)">
      <UBadge
        v-if="card.source"
        :label="sourceBadgeProps.label"
        :color="sourceBadgeProps.color"
        variant="subtle"
        size="xs"
      />
      <span v-else class="flex-1" />
      <span
        v-if="card.entered_at"
        class="text-xs text-(--ui-text-dimmed) shrink-0"
        :title="new Date(card.entered_at).toLocaleString('pt-BR')"
      >
        {{ formatRelativeDate(card.entered_at) }}
      </span>
    </div>
  </div>
</template>
