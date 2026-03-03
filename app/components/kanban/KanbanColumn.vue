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

interface KanbanColumnData {
  id: string
  name: string
  color?: string
  position?: number
  cards: KanbanCardData[]
}

const props = defineProps<{
  column: KanbanColumnData
  isEntryColumn: boolean
  boardId: string
}>()

const emit = defineEmits<{
  'add-card': [columnId: string]
  'drop-card': [payload: { cardId: string; toColumnId: string }]
  'card-click': [card: KanbanCardData]
  'open-conversation': [conversation: KanbanCardData['conversation']]
}>()

const isDragOver = ref(false)

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  isDragOver.value = true
}

function onDragLeave(event: DragEvent) {
  // Only reset if we truly left the column drop zone (not entered a child)
  const target = event.currentTarget as HTMLElement
  const related = event.relatedTarget as Node | null
  if (!target.contains(related)) {
    isDragOver.value = false
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
  const cardId = event.dataTransfer?.getData('text/plain')
  if (cardId) {
    emit('drop-card', { cardId, toColumnId: props.column.id })
  }
}

const columnBorderColor = computed(() => props.column.color || '#6366f1')
</script>

<template>
  <div
    class="flex flex-col w-72 shrink-0 rounded-xl bg-(--ui-bg-elevated) border border-(--ui-border) overflow-hidden transition-all duration-150"
    :class="{ 'ring-2 ring-(--ui-primary) ring-offset-1': isDragOver }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- Column header -->
    <div
      class="flex items-center gap-2 px-3 py-2.5 border-b border-(--ui-border)"
      :style="{ borderLeftColor: columnBorderColor, borderLeftWidth: '3px' }"
    >
      <div class="flex items-center gap-1.5 flex-1 min-w-0">
        <h3 class="font-semibold text-sm text-(--ui-text-highlighted) truncate">
          {{ column.name }}
        </h3>
        <UBadge
          :label="String(column.cards.length)"
          size="xs"
          variant="subtle"
          color="neutral"
        />
      </div>
      <UBadge
        v-if="isEntryColumn"
        label="Entrada"
        size="xs"
        color="success"
        variant="subtle"
      />
    </div>

    <!-- Drop zone indicator -->
    <div
      v-if="isDragOver && column.cards.length === 0"
      class="mx-2 my-2 h-16 rounded-lg border-2 border-dashed border-(--ui-primary) bg-(--ui-primary)/5 flex items-center justify-center"
    >
      <p class="text-xs text-(--ui-primary) font-medium">Soltar aqui</p>
    </div>

    <!-- Cards list -->
    <div class="flex-1 overflow-y-auto px-2 py-2 space-y-2 min-h-[120px]">
      <div
        v-if="isDragOver && column.cards.length > 0"
        class="h-1 rounded-full bg-(--ui-primary)/40 mx-1"
      />

      <KanbanCard
        v-for="card in column.cards"
        :key="card.id"
        :card="card"
        :is-entry-column="isEntryColumn"
        @move="() => {}"
        @click="emit('card-click', card)"
        @open-conversation="emit('open-conversation', $event)"
      />

      <div
        v-if="column.cards.length === 0 && !isDragOver"
        class="flex flex-col items-center justify-center py-6 text-center"
      >
        <UIcon name="i-lucide-inbox" class="text-xl text-(--ui-text-dimmed) mb-1" />
        <p class="text-xs text-(--ui-text-dimmed)">Nenhum card</p>
      </div>
    </div>

    <!-- Add card button -->
    <div class="px-2 py-2 border-t border-(--ui-border)">
      <UButton
        variant="ghost"
        color="neutral"
        size="sm"
        icon="i-lucide-plus"
        class="w-full justify-start text-(--ui-text-muted) hover:text-(--ui-text)"
        @click="emit('add-card', column.id)"
      >
        Adicionar Card
      </UButton>
    </div>
  </div>
</template>
