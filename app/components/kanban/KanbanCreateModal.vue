<script setup lang="ts">
interface ColumnDraft {
  name: string
  color: string
}

interface CreateKanbanPayload {
  name: string
  description: string
  columns: ColumnDraft[]
}

const props = defineProps<{
  modelValue: boolean
  agentName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [payload: CreateKanbanPayload]
}>()

const PRESET_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#8b5cf6',
  '#f97316',
  '#64748b'
]

const DEFAULT_COLUMNS: ColumnDraft[] = [
  { name: 'Novo Lead', color: '#6366f1' },
  { name: 'Em Contato', color: '#f59e0b' },
  { name: 'Convertido', color: '#22c55e' }
]

const boardName = ref('')
const description = ref('')
const columns = ref<ColumnDraft[]>([])

// Reset form when modal opens
watch(() => props.modelValue, (open) => {
  if (open) {
    boardName.value = props.agentName ? `Kanban - ${props.agentName}` : 'Novo Kanban'
    description.value = ''
    columns.value = DEFAULT_COLUMNS.map(c => ({ ...c }))
  }
})

// Also react to agentName change
watch(() => props.agentName, (name) => {
  if (props.modelValue && name) {
    boardName.value = `Kanban - ${name}`
  }
})

function close() {
  emit('update:modelValue', false)
}

function addColumn() {
  columns.value.push({
    name: 'Nova Raia',
    color: PRESET_COLORS[columns.value.length % PRESET_COLORS.length]
  })
}

function removeColumn(index: number) {
  columns.value.splice(index, 1)
}

function setColumnColor(index: number, color: string) {
  columns.value[index].color = color
}

const canSubmit = computed(() =>
  boardName.value.trim().length > 0 && columns.value.length > 0
)

function onSubmit() {
  if (!canSubmit.value) return
  emit('created', {
    name: boardName.value.trim(),
    description: description.value.trim(),
    columns: columns.value.filter(c => c.name.trim().length > 0)
  })
}
</script>

<template>
  <UModal
    :open="modelValue"
    title="Criar Kanban"
    :ui="{ content: 'max-w-lg' }"
    @update:open="emit('update:modelValue', $event)"
  >
    <template #body>
      <div class="space-y-5">
        <!-- Board details -->
        <div class="space-y-4">
          <UFormField
            label="Nome do board"
            required
          >
            <UInput
              v-model="boardName"
              placeholder="Ex: Kanban - Vendas"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Descrição">
            <UTextarea
              v-model="description"
              :rows="3"
              placeholder="Ex: O cliente entra neste kanban após agendar uma reunião via calendly"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Divider -->
        <div class="border-t border-(--ui-border)" />

        <!-- Columns section -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-sm font-medium text-(--ui-text-highlighted)">Raias (colunas)</p>
              <p class="text-xs text-(--ui-text-muted) mt-0.5">Configure as etapas do seu funil</p>
            </div>
            <UButton
              size="xs"
              variant="outline"
              icon="i-lucide-plus"
              @click="addColumn"
            >
              Adicionar
            </UButton>
          </div>

          <div class="space-y-2">
            <div
              v-for="(col, index) in columns"
              :key="index"
              class="flex items-center gap-2 p-2 rounded-lg bg-(--ui-bg-accented)"
            >
              <!-- Color picker -->
              <div class="flex items-center gap-1">
                <div
                  class="w-5 h-5 rounded-full shrink-0 ring-2 ring-offset-1 ring-(--ui-border)"
                  :style="{ backgroundColor: col.color }"
                />
                <div class="flex flex-wrap gap-1 p-1.5 rounded-lg bg-(--ui-bg) border border-(--ui-border) shadow-sm">
                  <button
                    v-for="preset in PRESET_COLORS"
                    :key="preset"
                    class="w-4 h-4 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    :class="col.color === preset ? 'ring-2 ring-offset-1 ring-(--ui-text)' : ''"
                    :style="{ backgroundColor: preset }"
                    :aria-label="`Selecionar cor ${preset}`"
                    :title="preset"
                    @click="setColumnColor(index, preset)"
                  />
                </div>
              </div>

              <!-- Column name -->
              <UInput
                v-model="columns[index].name"
                placeholder="Nome da raia"
                size="sm"
                class="flex-1"
              />

              <!-- Remove button -->
              <UButton
                icon="i-lucide-x"
                size="xs"
                variant="ghost"
                color="neutral"
                :disabled="columns.length <= 1"
                :aria-label="`Remover coluna ${col.name}`"
                @click="removeColumn(index)"
              />
            </div>

            <div
              v-if="columns.length === 0"
              class="text-center py-4"
            >
              <p class="text-sm text-(--ui-text-muted)">Nenhuma raia adicionada.</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          variant="ghost"
          color="neutral"
          @click="close"
        >
          Cancelar
        </UButton>
        <UButton
          icon="i-lucide-kanban"
          :disabled="!canSubmit"
          @click="onSubmit"
        >
          Criar Kanban
        </UButton>
      </div>
    </template>
  </UModal>
</template>
