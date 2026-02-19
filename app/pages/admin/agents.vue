<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const { updateAgentConfig, createAgent, deleteAgent } = useAgent()
const { can } = usePermissions()

const { data: configsData, refresh } = await useFetch('/api/admin/agents')
const configs = computed(() => (configsData.value as { data: Array<Record<string, unknown>> } | null)?.data || [])

const selectedConfig = ref<Record<string, unknown> | null>(null)
const saving = ref(false)
const toast = useToast()
const activeTab = ref('config')

// New agent modal
const showNewAgentModal = ref(false)
const newAgent = reactive({ name: '', system_prompt: '' })
const creatingAgent = ref(false)

// Delete confirmation
const showDeleteConfirm = ref(false)
const deletingAgent = ref(false)

const tabs = [
  { label: 'Configuration', value: 'config', icon: 'i-lucide-settings' },
  { label: 'Knowledge Base', value: 'knowledge', icon: 'i-lucide-book-open' },
  { label: 'WhatsApp', value: 'whatsapp', icon: 'i-lucide-smartphone' },
  { label: 'Widget Chat', value: 'widget', icon: 'i-lucide-code' }
]

function selectConfig(config: Record<string, unknown>) {
  selectedConfig.value = { ...config }
  activeTab.value = 'config'
}

async function saveConfig(data: Record<string, unknown>) {
  if (!selectedConfig.value?.id) return
  saving.value = true
  try {
    await $fetch(`/api/admin/agents/${selectedConfig.value.id as string}`, {
      method: 'PATCH',
      body: data
    })
    toast.add({ title: 'Configuração salva', color: 'success' })
    await refresh()
  } catch {
    toast.add({ title: 'Falha ao salvar configuração', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function handleCreateAgent() {
  if (!newAgent.name) return
  creatingAgent.value = true
  try {
    const res = await createAgent({ name: newAgent.name, system_prompt: newAgent.system_prompt }) as { data: Record<string, unknown> }
    toast.add({ title: 'Agent created', color: 'success' })
    showNewAgentModal.value = false
    newAgent.name = ''
    newAgent.system_prompt = ''
    await refresh()
    selectedConfig.value = { ...res.data }
  } catch {
    toast.add({ title: 'Failed to create agent', color: 'error' })
  } finally {
    creatingAgent.value = false
  }
}

async function handleDeleteAgent() {
  if (!selectedConfig.value?.id) return
  deletingAgent.value = true
  try {
    await deleteAgent(selectedConfig.value.id as string)
    toast.add({ title: 'Agent deleted', color: 'success' })
    selectedConfig.value = null
    showDeleteConfirm.value = false
    await refresh()
  } catch {
    toast.add({ title: 'Failed to delete agent', color: 'error' })
  } finally {
    deletingAgent.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-3rem)]">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 shrink-0">
      <div>
        <h1 class="text-2xl font-bold">
          Agents
        </h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">
          Manage your AI agents, prompts, and integrations.
        </p>
      </div>
      <UButton
        v-if="can('agents.create')"
        icon="i-lucide-plus"
        @click="showNewAgentModal = true"
      >
        New Agent
      </UButton>
    </div>

    <!-- Main Layout -->
    <div class="flex-1 flex gap-4 min-h-0">
      <!-- Sidebar: agent list -->
      <div class="w-64 shrink-0 flex flex-col">
        <UCard class="flex-1 flex flex-col overflow-hidden">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-bot"
                class="text-lg"
              />
              <span class="font-medium text-sm">Your Agents</span>
              <UBadge
                v-if="configs.length > 0"
                :label="String(configs.length)"
                size="sm"
                variant="subtle"
              />
            </div>
          </template>
          <div class="flex-1 overflow-y-auto -mx-4 -my-4 px-2 py-2">
            <div
              v-if="configs.length === 0"
              class="text-center py-8 px-2"
            >
              <UIcon
                name="i-lucide-bot"
                class="text-3xl text-(--ui-text-dimmed) mb-3"
              />
              <p class="text-(--ui-text-muted) text-xs">
                No agents yet.
              </p>
              <UButton
                v-if="can('agents.create')"
                class="mt-3"
                size="xs"
                variant="soft"
                @click="showNewAgentModal = true"
              >
                Create first agent
              </UButton>
            </div>
            <div
              v-else
              class="space-y-1"
            >
              <button
                v-for="config in configs"
                :key="config.id as string"
                :class="[
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-colors',
                  selectedConfig?.id === config.id
                    ? 'bg-(--ui-primary) text-white'
                    : 'text-(--ui-text) hover:bg-(--ui-bg-accented)'
                ]"
                @click="selectConfig(config)"
              >
                <UIcon
                  name="i-lucide-bot"
                  class="shrink-0"
                />
                <span class="truncate flex-1">{{ config.name || 'Unnamed' }}</span>
                <span
                  v-if="config.is_active"
                  :class="[
                    'w-2 h-2 rounded-full shrink-0',
                    selectedConfig?.id === config.id ? 'bg-white' : 'bg-green-500'
                  ]"
                />
              </button>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Main content with tabs -->
      <div class="flex-1 flex flex-col min-w-0">
        <template v-if="selectedConfig">
          <!-- Agent Header Card -->
          <div class="flex items-center gap-4 mb-4 p-4 rounded-xl bg-(--ui-bg-elevated) border border-(--ui-border)">
            <div class="p-2.5 rounded-lg bg-(--ui-primary)/10">
              <UIcon
                name="i-lucide-bot"
                class="text-2xl text-(--ui-primary)"
              />
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="text-lg font-semibold truncate">
                {{ selectedConfig.name }}
              </h2>
              <div class="flex items-center gap-2 mt-0.5">
                <UBadge
                  v-if="selectedConfig.is_active"
                  label="Active"
                  size="xs"
                  color="success"
                  variant="subtle"
                />
                <UBadge
                  v-else
                  label="Inactive"
                  size="xs"
                  color="neutral"
                  variant="subtle"
                />
                <span class="text-xs text-(--ui-text-dimmed)">
                  ID: {{ (selectedConfig.id as string).substring(0, 8) }}...
                </span>
              </div>
            </div>
            <UButton
              v-if="can('agents.delete')"
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="sm"
              @click="showDeleteConfirm = true"
            />
          </div>

          <!-- Tabs -->
          <div class="flex gap-1 mb-4 p-1 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) shrink-0">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              :class="[
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.value
                  ? 'bg-(--ui-bg) text-(--ui-text-highlighted) shadow-sm'
                  : 'text-(--ui-text-muted) hover:text-(--ui-text)'
              ]"
              @click="activeTab = tab.value"
            >
              <UIcon
                :name="tab.icon"
                class="text-base"
              />
              <span class="hidden sm:inline">{{ tab.label }}</span>
            </button>
          </div>

          <!-- Tab Content -->
          <div class="flex-1 overflow-y-auto">
            <!-- Configuration Tab -->
            <UCard v-if="activeTab === 'config'">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-settings"
                    class="text-lg"
                  />
                  <span class="font-medium">Agent Configuration</span>
                </div>
              </template>
              <AdminAgentConfigForm
                :initial-data="selectedConfig"
                :loading="saving"
                @save="saveConfig"
              />
            </UCard>

            <!-- Knowledge Base Tab -->
            <UCard v-if="activeTab === 'knowledge'">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-book-open"
                    class="text-lg"
                  />
                  <span class="font-medium">Knowledge Base</span>
                </div>
              </template>
              <AdminKnowledgeBaseManager :agent-id="selectedConfig.id as string" />
            </UCard>

            <!-- WhatsApp Tab -->
            <UCard v-if="activeTab === 'whatsapp'">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-smartphone"
                    class="text-lg"
                  />
                  <span class="font-medium">WhatsApp Integration</span>
                </div>
              </template>
              <AdminWhatsAppConnect :agent-id="selectedConfig.id as string" />
            </UCard>

            <!-- Widget Tab -->
            <UCard v-if="activeTab === 'widget'">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-code"
                    class="text-lg"
                  />
                  <span class="font-medium">Chat Widget</span>
                </div>
              </template>
              <AdminWidgetConfig
                :agent-id="selectedConfig.id as string"
                :initial-widget-config="(selectedConfig.widget_config as Record<string, unknown>) || {}"
                @save="saveConfig"
              />
            </UCard>
          </div>
        </template>

        <!-- No agent selected -->
        <div
          v-else
          class="flex-1 flex flex-col items-center justify-center text-center"
        >
          <div class="p-5 rounded-full bg-(--ui-bg-accented) mb-4">
            <UIcon
              name="i-lucide-mouse-pointer-click"
              class="text-4xl text-(--ui-text-dimmed)"
            />
          </div>
          <p class="text-(--ui-text-muted) text-sm">
            Select an agent to configure or create a new one.
          </p>
        </div>
      </div>
    </div>

    <!-- New Agent Modal -->
    <UModal
      v-model:open="showNewAgentModal"
      title="Create New Agent"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Agent Name">
            <UInput
              v-model="newAgent.name"
              placeholder="e.g. Customer Support Bot"
              class="w-full"
            />
          </UFormField>

          <UFormField label="System Prompt">
            <UTextarea
              v-model="newAgent.system_prompt"
              :rows="4"
              placeholder="Define the agent's behavior..."
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
            @click="showNewAgentModal = false"
          >
            Cancel
          </UButton>
          <UButton
            :disabled="!newAgent.name"
            :loading="creatingAgent"
            @click="handleCreateAgent"
          >
            Create
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal
      v-model:open="showDeleteConfirm"
      title="Delete Agent"
    >
      <template #body>
        <p>
          Are you sure you want to delete <strong>{{ selectedConfig?.name }}</strong>?
          This will also remove all knowledge base entries and conversations.
        </p>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            @click="showDeleteConfirm = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            :loading="deletingAgent"
            @click="handleDeleteAgent"
          >
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
