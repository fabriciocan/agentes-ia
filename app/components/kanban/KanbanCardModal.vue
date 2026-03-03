<script setup lang="ts">
interface KanbanConversation {
  id: string
  status?: string
  created_at?: string
}

interface KanbanMove {
  from_column: string
  to_column: string
  moved_at: string
  from_column_name?: string
  to_column_name?: string
}

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
  conversation?: KanbanConversation
  column_id: string
  moves?: KanbanMove[]
}

interface KanbanColumn {
  id: string
  name: string
}

const props = defineProps<{
  card: KanbanCardData | null
  columns: KanbanColumn[]
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [data: Partial<KanbanCardData>]
  delete: [cardId: string]
}>()

const toast = useToast()
const showDeleteConfirm = ref(false)

const form = reactive({
  title: '',
  client_name: '',
  client_phone: '',
  client_email: '',
  notes: '',
  tagsInput: '',
  column_id: ''
})

watch(() => props.card, (card) => {
  if (card) {
    form.title = card.title || ''
    form.client_name = card.client_name || ''
    form.client_phone = card.client_phone || ''
    form.client_email = card.client_email || ''
    form.notes = card.notes || ''
    form.tagsInput = (card.tags || []).join(', ')
    form.column_id = card.column_id || ''
  }
}, { immediate: true })

const columnOptions = computed(() =>
  props.columns.map(c => ({ label: c.name, value: c.id }))
)

function close() {
  emit('update:modelValue', false)
  showDeleteConfirm.value = false
}

function onSave() {
  const tags = form.tagsInput
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  emit('save', {
    title: form.title,
    client_name: form.client_name,
    client_phone: form.client_phone || undefined,
    client_email: form.client_email || undefined,
    notes: form.notes || undefined,
    tags,
    column_id: form.column_id
  })
}

function onDeleteConfirm() {
  if (props.card) {
    emit('delete', props.card.id)
    showDeleteConfirm.value = false
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

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
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const conversationStatusColor = computed(() => {
  switch (props.card?.conversation?.status) {
    case 'active': return 'success'
    case 'closed': return 'neutral'
    case 'pending': return 'warning'
    default: return 'neutral'
  }
})
</script>

<template>
  <UModal
    :open="modelValue"
    :title="card?.client_name || card?.title || 'Detalhes do Card'"
    :ui="{ content: 'max-w-3xl' }"
    @update:open="emit('update:modelValue', $event)"
  >
    <template #body>
      <div v-if="card" class="flex gap-6">
        <!-- Left column: editable form -->
        <div class="flex-1 min-w-0 space-y-4">
          <UFormField label="Título">
            <UInput
              v-model="form.title"
              placeholder="Título do card"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Nome do cliente">
            <UInput
              v-model="form.client_name"
              placeholder="Nome completo"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Telefone">
              <UInput
                v-model="form.client_phone"
                placeholder="+55 11 99999-0000"
                class="w-full"
              >
                <template #leading>
                  <UIcon name="i-lucide-phone" class="text-(--ui-text-dimmed)" />
                </template>
              </UInput>
            </UFormField>

            <UFormField label="E-mail">
              <UInput
                v-model="form.client_email"
                type="email"
                placeholder="email@exemplo.com"
                class="w-full"
              >
                <template #leading>
                  <UIcon name="i-lucide-mail" class="text-(--ui-text-dimmed)" />
                </template>
              </UInput>
            </UFormField>
          </div>

          <UFormField label="Coluna">
            <USelect
              v-model="form.column_id"
              :items="columnOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Tags"
            hint="Separadas por vírgula"
          >
            <UInput
              v-model="form.tagsInput"
              placeholder="lead-quente, agendamento, vip"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Observações">
            <UTextarea
              v-model="form.notes"
              :rows="4"
              placeholder="Anotações sobre este lead..."
              class="w-full"
            />
          </UFormField>

          <!-- Meta info -->
          <div class="text-xs text-(--ui-text-dimmed) space-y-1 pt-1">
            <div v-if="card.source" class="flex items-center gap-1.5">
              <span>Origem:</span>
              <UBadge
                :label="card.source"
                :color="card.source === 'n8n' ? 'primary' : card.source === 'webhook' ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              />
            </div>
            <div v-if="card.entered_at">
              Entrou: {{ formatDate(card.entered_at) }}
            </div>
          </div>
        </div>

        <!-- Right column: conversation + history -->
        <div v-if="card.conversation" class="w-52 shrink-0 space-y-4">
          <!-- Conversation card -->
          <div class="rounded-lg border border-(--ui-border) p-3 bg-(--ui-bg-elevated) space-y-2">
            <div class="flex items-center gap-2 mb-1">
              <UIcon name="i-lucide-message-circle" class="text-(--ui-primary)" />
              <span class="text-sm font-medium">Conversa</span>
            </div>

            <div v-if="card.conversation.status" class="flex items-center gap-1.5">
              <UBadge
                :label="card.conversation.status"
                :color="conversationStatusColor"
                variant="subtle"
                size="xs"
              />
            </div>

            <div v-if="card.conversation.created_at" class="text-xs text-(--ui-text-muted)">
              Criada {{ formatRelativeDate(card.conversation.created_at) }}
            </div>

            <UButton
              size="xs"
              variant="outline"
              icon="i-lucide-external-link"
              class="w-full mt-1"
              :to="`/admin/conversations?conversation=${card.conversation.id}`"
              target="_blank"
            >
              Ver conversa
            </UButton>
          </div>

          <!-- Move history timeline -->
          <div v-if="card.moves && card.moves.length > 0" class="space-y-2">
            <p class="text-xs font-medium text-(--ui-text-muted) uppercase tracking-wide">
              Histórico
            </p>
            <div class="relative pl-3 space-y-3">
              <div
                class="absolute left-1 top-1 bottom-1 w-px bg-(--ui-border)"
                aria-hidden="true"
              />
              <div
                v-for="(move, index) in card.moves"
                :key="index"
                class="relative"
              >
                <div class="absolute -left-2.5 top-1 w-2 h-2 rounded-full bg-(--ui-primary)" />
                <div class="text-xs text-(--ui-text-muted) leading-relaxed">
                  <span class="font-medium text-(--ui-text)">
                    {{ move.from_column_name || move.from_column }}
                  </span>
                  <UIcon name="i-lucide-arrow-right" class="inline mx-0.5 text-xs" />
                  <span class="font-medium text-(--ui-text)">
                    {{ move.to_column_name || move.to_column }}
                  </span>
                  <div class="text-(--ui-text-dimmed) mt-0.5">
                    {{ formatRelativeDate(move.moved_at) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete confirmation inline -->
      <div
        v-if="showDeleteConfirm"
        class="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
      >
        <p class="text-sm text-red-700 dark:text-red-400 mb-3">
          Tem certeza que deseja excluir este card? Esta ação não pode ser desfeita.
        </p>
        <div class="flex gap-2">
          <UButton
            size="sm"
            color="error"
            :loading="false"
            @click="onDeleteConfirm"
          >
            Confirmar exclusão
          </UButton>
          <UButton
            size="sm"
            variant="ghost"
            color="neutral"
            @click="showDeleteConfirm = false"
          >
            Cancelar
          </UButton>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <UButton
          v-if="!showDeleteConfirm"
          icon="i-lucide-trash-2"
          variant="ghost"
          color="error"
          size="sm"
          @click="showDeleteConfirm = true"
        >
          Excluir
        </UButton>
        <span v-else />

        <div class="flex gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            @click="close"
          >
            Cancelar
          </UButton>
          <UButton
            icon="i-lucide-save"
            @click="onSave"
          >
            Salvar
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
