<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

// ─── Types ─────────────────────────────────────────────────────────────────

interface Agent {
  id: string
  name: string
  company_id?: string
}

interface KanbanConversation {
  id: string
  status?: string
  created_at?: string
}

interface KanbanCardMove {
  from_column: string
  to_column: string
  moved_at: string
  from_column_name?: string
  to_column_name?: string
}

interface KanbanCard {
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
  moves?: KanbanCardMove[]
}

interface KanbanColumn {
  id: string
  name: string
  color?: string
  position?: number
  cards: KanbanCard[]
}

interface KanbanBoard {
  id: string
  name: string
  description?: string
  entry_column_id?: string
  columns: KanbanColumn[]
}

interface KanbanFiltersValue {
  dateFrom: string
  dateTo: string
  columnId: string
  search: string
}

// ─── State ─────────────────────────────────────────────────────────────────

const toast = useToast()

// Agents
const { data: agentsData } = await useFetch('/api/admin/agents')
const agents = computed<Agent[]>(() => {
  const raw = agentsData.value as { data: Agent[] } | null
  return raw?.data || []
})
const selectedAgentId = ref<string | null>(agents.value[0]?.id ?? null)
const selectedAgent = computed(() => agents.value.find(a => a.id === selectedAgentId.value))

// Board
const board = ref<KanbanBoard | null>(null)
const loadingBoard = ref(false)

// Filters
const filters = ref<KanbanFiltersValue>({
  dateFrom: '',
  dateTo: '',
  columnId: '',
  search: ''
})

// Modals
const showCreateModal = ref(false)
const showCardModal = ref(false)
const showCreateCardModal = ref(false)
const showSettingsDropdown = ref(false)
const showDeleteBoardConfirm = ref(false)
const selectedCard = ref<KanbanCard | null>(null)

// Add column inline
const addingColumn = ref(false)
const newColumnName = ref('')
const newColumnColor = ref('#6366f1')

// Settings edit
const settingsName = ref('')
const settingsDescription = ref('')
const settingsEntryColumnId = ref('')
const savingSettings = ref(false)
const showSettingsModal = ref(false)
const deletingBoard = ref(false)

// Create card form
const createCardForm = reactive({
  title: '',
  client_name: '',
  client_phone: '',
  client_email: '',
  notes: '',
  column_id: ''
})
const creatingCard = ref(false)

// ─── Agent options ──────────────────────────────────────────────────────────

const agentOptions = computed(() =>
  agents.value.map(a => ({ label: a.name, value: a.id }))
)

// ─── Load board ─────────────────────────────────────────────────────────────

async function loadBoard(agentId: string, silent = false) {
  if (!silent) {
    loadingBoard.value = true
    board.value = null
  }
  try {
    const res = await $fetch<{ data: KanbanBoard | null }>(`/api/admin/agents/${agentId}/kanban`)
    if (!res.data) {
      board.value = null
      return
    }
    if (silent && board.value) {
      // Patch in-place: update scalar fields and splice columns/cards arrays
      board.value.name = res.data.name
      board.value.description = res.data.description
      board.value.entry_column_id = res.data.entry_column_id
      board.value.columns.splice(0, board.value.columns.length, ...res.data.columns)
    } else {
      board.value = res.data
    }
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode
    if (status !== 404) {
      toast.add({ title: 'Erro ao carregar kanban', color: 'error' })
    }
    if (!silent) board.value = null
  } finally {
    if (!silent) loadingBoard.value = false
  }
}

watch(selectedAgentId, (id) => {
  if (id) loadBoard(id)
  else board.value = null
}, { immediate: true })

// ─── Filtered columns ────────────────────────────────────────────────────────

const filteredColumns = computed<KanbanColumn[]>(() => {
  if (!board.value) return []
  const { search, columnId, dateFrom, dateTo } = filters.value

  return board.value.columns.map(col => {
    if (columnId && col.id !== columnId) return { ...col, cards: [] }

    const filtered = col.cards.filter(card => {
      if (search) {
        const q = search.toLowerCase()
        const matches =
          card.client_name?.toLowerCase().includes(q) ||
          card.title?.toLowerCase().includes(q) ||
          card.client_phone?.includes(q) ||
          card.client_email?.toLowerCase().includes(q)
        if (!matches) return false
      }
      if (dateFrom && card.entered_at) {
        if (new Date(card.entered_at) < new Date(dateFrom)) return false
      }
      if (dateTo && card.entered_at) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (new Date(card.entered_at) > toDate) return false
      }
      return true
    })

    return { ...col, cards: filtered }
  })
})

const columnOptions = computed(() =>
  board.value?.columns.map(c => ({ id: c.id, name: c.name })) ?? []
)

// ─── Create board ────────────────────────────────────────────────────────────

async function handleCreateBoard(payload: { name: string; description: string; columns: Array<{ name: string; color: string }> }) {
  if (!selectedAgentId.value) return
  try {
    const res = await $fetch<{ data: KanbanBoard }>(`/api/admin/agents/${selectedAgentId.value}/kanban`, {
      method: 'POST',
      body: { name: payload.name, description: payload.description }
    })
    const newBoard = res.data

    // Create columns in order
    for (const col of payload.columns) {
      await $fetch(`/api/admin/kanban/${newBoard.id}/columns`, {
        method: 'POST',
        body: { name: col.name, color: col.color }
      })
    }

    showCreateModal.value = false
    await loadBoard(selectedAgentId.value)
    toast.add({ title: 'Kanban criado com sucesso!', color: 'success' })
  } catch {
    toast.add({ title: 'Erro ao criar kanban', color: 'error' })
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────

function openSettings() {
  if (!board.value) return
  settingsName.value = board.value.name
  settingsDescription.value = board.value.description || ''
  settingsEntryColumnId.value = board.value.entry_column_id || ''
  showSettingsModal.value = true
  showSettingsDropdown.value = false
}

async function saveSettings() {
  if (!board.value || !selectedAgentId.value) return
  savingSettings.value = true
  try {
    await $fetch(`/api/admin/agents/${selectedAgentId.value}/kanban`, {
      method: 'PATCH',
      body: {
        name: settingsName.value,
        description: settingsDescription.value,
        entry_column_id: settingsEntryColumnId.value || undefined
      }
    })
    showSettingsModal.value = false
    await loadBoard(selectedAgentId.value, true)
    toast.add({ title: 'Configurações salvas', color: 'success' })
  } catch {
    toast.add({ title: 'Erro ao salvar configurações', color: 'error' })
  } finally {
    savingSettings.value = false
  }
}

async function handleDeleteBoard() {
  // Note: implement DELETE /api/admin/agents/:agentId/kanban if available
  // For now we clear locally and show success
  deletingBoard.value = true
  try {
    await $fetch(`/api/admin/agents/${selectedAgentId.value}/kanban`, {
      method: 'DELETE'
    })
    toast.add({ title: 'Board excluído', color: 'success' })
    board.value = null
    showDeleteBoardConfirm.value = false
    showSettingsModal.value = false
  } catch {
    toast.add({ title: 'Erro ao excluir board', color: 'error' })
  } finally {
    deletingBoard.value = false
  }
}

// ─── Add column ──────────────────────────────────────────────────────────────

const COLUMN_PRESET_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#06b6d4', '#8b5cf6', '#f97316', '#64748b'
]

function startAddColumn() {
  addingColumn.value = true
  newColumnName.value = ''
  newColumnColor.value = COLUMN_PRESET_COLORS[
    (board.value?.columns.length ?? 0) % COLUMN_PRESET_COLORS.length
  ]
}

async function confirmAddColumn() {
  if (!board.value || !newColumnName.value.trim()) return
  try {
    await $fetch(`/api/admin/kanban/${board.value.id}/columns`, {
      method: 'POST',
      body: { name: newColumnName.value.trim(), color: newColumnColor.value }
    })
    addingColumn.value = false
    newColumnName.value = ''
    await loadBoard(selectedAgentId.value!, true)
    toast.add({ title: 'Raia adicionada', color: 'success' })
  } catch {
    toast.add({ title: 'Erro ao adicionar raia', color: 'error' })
  }
}

function cancelAddColumn() {
  addingColumn.value = false
  newColumnName.value = ''
}

// ─── Create card ─────────────────────────────────────────────────────────────

function openCreateCard(columnId?: string) {
  createCardForm.title = ''
  createCardForm.client_name = ''
  createCardForm.client_phone = ''
  createCardForm.client_email = ''
  createCardForm.notes = ''
  createCardForm.column_id = columnId || board.value?.columns[0]?.id || ''
  showCreateCardModal.value = true
}

async function handleCreateCard() {
  if (!board.value || !createCardForm.client_name.trim()) return
  creatingCard.value = true
  const boardId = board.value.id
  const agentId = selectedAgentId.value!
  try {
    await $fetch(`/api/admin/kanban/${boardId}/cards`, {
      method: 'POST',
      body: {
        title: createCardForm.title || createCardForm.client_name,
        client_name: createCardForm.client_name,
        client_phone: createCardForm.client_phone || undefined,
        client_email: createCardForm.client_email || undefined,
        notes: createCardForm.notes || undefined,
        column_id: createCardForm.column_id
      }
    })
    showCreateCardModal.value = false
    toast.add({ title: 'Card criado com sucesso', color: 'success' })
  } catch {
    toast.add({ title: 'Erro ao criar card', color: 'error' })
    return
  } finally {
    creatingCard.value = false
  }
  await loadBoard(agentId, true)
}

// ─── Card detail ─────────────────────────────────────────────────────────────

function openCardDetail(card: KanbanCard) {
  selectedCard.value = card
  showCardModal.value = true
}

async function handleSaveCard(data: Partial<KanbanCard>) {
  if (!board.value || !selectedCard.value) return
  const boardId = board.value.id
  const cardId = selectedCard.value.id
  const agentId = selectedAgentId.value!
  try {
    await $fetch(`/api/admin/kanban/${boardId}/cards/${cardId}`, {
      method: 'PATCH',
      body: data
    })
    showCardModal.value = false
    selectedCard.value = null
    toast.add({ title: 'Card atualizado', color: 'success' })
  } catch {
    toast.add({ title: 'Erro ao atualizar card', color: 'error' })
    return
  }
  await loadBoard(agentId, true)
}

async function handleDeleteCard(cardId: string) {
  if (!board.value) return
  const boardId = board.value.id
  const agentId = selectedAgentId.value!
  try {
    await $fetch(`/api/admin/kanban/${boardId}/cards/${cardId}`, {
      method: 'DELETE'
    })
    showCardModal.value = false
    selectedCard.value = null
    toast.add({ title: 'Card excluído', color: 'success' })
  } catch {
    toast.add({ title: 'Erro ao excluir card', color: 'error' })
    return
  }
  await loadBoard(agentId, true)
}

// ─── Drag and drop ───────────────────────────────────────────────────────────

async function handleDropCard(payload: { cardId: string; toColumnId: string }) {
  if (!board.value) return

  // Find the card's current column
  const fromColumn = board.value.columns.find(col =>
    col.cards.some(c => c.id === payload.cardId)
  )
  if (!fromColumn || fromColumn.id === payload.toColumnId) return

  // Optimistic update
  const card = fromColumn.cards.find(c => c.id === payload.cardId)!
  fromColumn.cards = fromColumn.cards.filter(c => c.id !== payload.cardId)
  const toColumn = board.value.columns.find(c => c.id === payload.toColumnId)!
  toColumn.cards.push({ ...card, column_id: payload.toColumnId })

  try {
    await $fetch(`/api/admin/kanban/${board.value.id}/cards/${payload.cardId}/move`, {
      method: 'PATCH',
      body: { column_id: payload.toColumnId }
    })
  } catch {
    toast.add({ title: 'Erro ao mover card', color: 'error' })
    await loadBoard(selectedAgentId.value!, true)
  }
}

// ─── Settings column options ─────────────────────────────────────────────────

const settingsColumnOptions = computed(() =>
  board.value?.columns.map(c => ({ label: c.name, value: c.id })) ?? []
)
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-3rem)]">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-4 shrink-0">
      <div>
        <h1 class="text-2xl font-bold">Kanban</h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">
          Gerencie seus leads em um funil visual por agente.
        </p>
      </div>

      <!-- Agent selector -->
      <div class="flex items-center gap-2">
        <USelect
          v-model="selectedAgentId"
          :items="agentOptions"
          value-key="value"
          label-key="label"
          placeholder="Selecionar agente"
          class="w-52"
        />
      </div>
    </div>

    <!-- No agent selected -->
    <div
      v-if="!selectedAgentId"
      class="flex-1 flex flex-col items-center justify-center text-center"
    >
      <div class="p-5 rounded-full bg-(--ui-bg-accented) mb-4">
        <UIcon name="i-lucide-kanban-square" class="text-4xl text-(--ui-text-dimmed)" />
      </div>
      <p class="text-lg font-medium text-(--ui-text-highlighted) mb-1">Selecione um agente</p>
      <p class="text-sm text-(--ui-text-muted)">
        Escolha um agente para visualizar ou criar seu kanban.
      </p>
    </div>

    <!-- Loading board -->
    <div v-else-if="loadingBoard" class="flex-1 flex flex-col gap-4">
      <div class="flex gap-3 px-1">
        <USkeleton v-for="i in 3" :key="i" class="h-[calc(100vh-12rem)] w-72 rounded-xl shrink-0" />
      </div>
    </div>

    <!-- No board — empty state -->
    <div
      v-else-if="!board"
      class="flex-1 flex flex-col items-center justify-center text-center"
    >
      <div class="p-5 rounded-full bg-(--ui-bg-accented) mb-4">
        <UIcon name="i-lucide-kanban-square" class="text-4xl text-(--ui-primary)" />
      </div>
      <p class="text-lg font-medium text-(--ui-text-highlighted) mb-1">
        Nenhum kanban encontrado
      </p>
      <p class="text-sm text-(--ui-text-muted) mb-5 max-w-xs">
        Crie um kanban para o agente <strong>{{ selectedAgent?.name }}</strong> e comece a organizar seus leads.
      </p>
      <UButton
        icon="i-lucide-plus"
        size="lg"
        @click="showCreateModal = true"
      >
        Criar Kanban
      </UButton>
    </div>

    <!-- Board view -->
    <template v-else>
      <!-- Board header -->
      <div class="flex items-start justify-between gap-4 mb-3 shrink-0">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-kanban" class="text-lg text-(--ui-primary) shrink-0" />
            <h2 class="text-lg font-semibold text-(--ui-text-highlighted) truncate">
              {{ board.name }}
            </h2>
          </div>
          <p
            v-if="board.description"
            class="text-sm text-(--ui-text-muted) mt-0.5 line-clamp-1"
          >
            {{ board.description }}
          </p>
        </div>

        <!-- Settings button -->
        <div class="relative shrink-0">
          <UButton
            icon="i-lucide-settings-2"
            variant="outline"
            color="neutral"
            size="sm"
            @click="showSettingsDropdown = !showSettingsDropdown"
          >
            Configurações
          </UButton>

          <!-- Settings dropdown -->
          <div
            v-if="showSettingsDropdown"
            class="absolute right-0 top-full mt-1 w-52 rounded-lg bg-(--ui-bg) border border-(--ui-border) shadow-lg z-10"
          >
            <div class="p-1">
              <button
                class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-(--ui-text) hover:bg-(--ui-bg-accented) transition-colors"
                @click="openSettings"
              >
                <UIcon name="i-lucide-pencil" class="text-base text-(--ui-text-muted)" />
                Editar board
              </button>
              <button
                class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                @click="showDeleteBoardConfirm = true; showSettingsDropdown = false"
              >
                <UIcon name="i-lucide-trash-2" class="text-base" />
                Excluir board
              </button>
            </div>
          </div>

          <!-- Click outside to close -->
          <div
            v-if="showSettingsDropdown"
            class="fixed inset-0 z-0"
            @click="showSettingsDropdown = false"
          />
        </div>
      </div>

      <!-- Filters -->
      <div class="mb-3 shrink-0">
        <KanbanFilters
          v-model="filters"
          :columns="columnOptions"
        />
      </div>

      <!-- Board: horizontal scroll columns -->
      <div class="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
        <div class="flex gap-3 h-full pb-2 pr-2">
          <KanbanColumn
            v-for="col in filteredColumns"
            :key="col.id"
            :column="col"
            :is-entry-column="col.id === board.entry_column_id"
            :board-id="board.id"
            @add-card="openCreateCard"
            @drop-card="handleDropCard"
            @card-click="openCardDetail"
            @open-conversation="(conv) => {
              if (conv) navigateTo(`/admin/conversations?conversation=${conv.id}`)
            }"
          />

          <!-- Add column inline -->
          <div class="shrink-0 w-72">
            <div
              v-if="!addingColumn"
              class="h-full flex items-start pt-1"
            >
              <UButton
                variant="ghost"
                color="neutral"
                icon="i-lucide-plus"
                class="text-(--ui-text-muted)"
                @click="startAddColumn"
              >
                Nova Raia
              </UButton>
            </div>

            <div
              v-else
              class="rounded-xl bg-(--ui-bg-elevated) border border-(--ui-border) p-3 space-y-3"
            >
              <p class="text-sm font-medium text-(--ui-text-highlighted)">Nova raia</p>

              <UInput
                v-model="newColumnName"
                placeholder="Nome da raia"
                size="sm"
                class="w-full"
                autofocus
                @keyup.enter="confirmAddColumn"
                @keyup.escape="cancelAddColumn"
              />

              <!-- Color picker -->
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="color in COLUMN_PRESET_COLORS"
                  :key="color"
                  class="w-5 h-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  :class="newColumnColor === color ? 'ring-2 ring-offset-1 ring-(--ui-text)' : ''"
                  :style="{ backgroundColor: color }"
                  :aria-label="`Selecionar cor ${color}`"
                  @click="newColumnColor = color"
                />
              </div>

              <div class="flex gap-2">
                <UButton
                  size="sm"
                  :disabled="!newColumnName.trim()"
                  @click="confirmAddColumn"
                >
                  Adicionar
                </UButton>
                <UButton
                  size="sm"
                  variant="ghost"
                  color="neutral"
                  @click="cancelAddColumn"
                >
                  Cancelar
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ─── Modals ─────────────────────────────────────────────────────── -->

    <!-- Create board modal -->
    <KanbanCreateModal
      v-model="showCreateModal"
      :agent-name="selectedAgent?.name || ''"
      @created="handleCreateBoard"
    />

    <!-- Card detail modal -->
    <KanbanCardModal
      v-model="showCardModal"
      :card="selectedCard"
      :columns="columnOptions"
      @save="handleSaveCard"
      @delete="handleDeleteCard"
    />

    <!-- Create card modal -->
    <UModal
      v-model:open="showCreateCardModal"
      title="Novo Card"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Nome do cliente" required>
            <UInput
              v-model="createCardForm.client_name"
              placeholder="Nome completo"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Título / Assunto">
            <UInput
              v-model="createCardForm.title"
              placeholder="Ex: Agendamento de reunião"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Telefone">
              <UInput
                v-model="createCardForm.client_phone"
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
                v-model="createCardForm.client_email"
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
              v-model="createCardForm.column_id"
              :items="board?.columns.map(c => ({ label: c.name, value: c.id })) || []"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Observações">
            <UTextarea
              v-model="createCardForm.notes"
              :rows="3"
              placeholder="Anotações sobre este lead..."
              class="w-full"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            @click="showCreateCardModal = false"
          >
            Cancelar
          </UButton>
          <UButton
            icon="i-lucide-plus"
            :loading="creatingCard"
            :disabled="!createCardForm.client_name.trim()"
            @click="handleCreateCard"
          >
            Criar Card
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Settings modal -->
    <UModal
      v-model:open="showSettingsModal"
      title="Configurações do Board"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Nome do board" required>
            <UInput
              v-model="settingsName"
              placeholder="Nome do kanban"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Descrição">
            <UTextarea
              v-model="settingsDescription"
              :rows="3"
              placeholder="Descreva o propósito deste kanban..."
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Coluna de entrada"
            hint="Cards novos entram nesta coluna automaticamente"
          >
            <USelect
              v-model="settingsEntryColumnId"
              :items="[{ label: 'Nenhuma', value: '' }, ...settingsColumnOptions]"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            @click="showSettingsModal = false"
          >
            Cancelar
          </UButton>
          <UButton
            icon="i-lucide-save"
            :loading="savingSettings"
            :disabled="!settingsName.trim()"
            @click="saveSettings"
          >
            Salvar
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete board confirmation modal -->
    <UModal
      v-model:open="showDeleteBoardConfirm"
      title="Excluir Board"
    >
      <template #body>
        <div class="space-y-3">
          <div class="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
            <UIcon name="i-lucide-triangle-alert" class="text-xl text-red-600 dark:text-red-400 shrink-0" />
            <p class="text-sm text-red-700 dark:text-red-400">
              Esta ação é irreversível. Todos os cards e raias serão excluídos permanentemente.
            </p>
          </div>
          <p class="text-sm text-(--ui-text-muted)">
            Tem certeza que deseja excluir o board <strong class="text-(--ui-text)">{{ board?.name }}</strong>?
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            @click="showDeleteBoardConfirm = false"
          >
            Cancelar
          </UButton>
          <UButton
            color="error"
            icon="i-lucide-trash-2"
            :loading="deletingBoard"
            @click="handleDeleteBoard"
          >
            Excluir board
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
