<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const toast = useToast()

interface MetaAccount {
  id: string
  phone_number_id: string
  waba_id: string
  display_phone_number: string | null
  verified_name: string | null
  status: string
  agent_configs: { id: string; name: string }[]
}

interface Template {
  id: string
  name: string
  status: string
  category: string
  language: string
  components: unknown[]
  quality_score?: { score: string }
}

// ─── Accounts ────────────────────────────────────────────────────────────────

const { data: accountsData, refresh: refreshAccounts } = await useFetch<{ data: MetaAccount[] }>('/api/admin/meta/accounts')
const accounts = computed(() => accountsData.value?.data ?? [])

const showConnectModal = ref(false)
const deletingAccount = ref<string | null>(null)

function onAccountConnected() {
  showConnectModal.value = false
  refreshAccounts()
}

async function handleDeleteAccount(account: MetaAccount) {
  if (!confirm(`Remover o número ${account.display_phone_number ?? account.phone_number_id}? Esta ação não pode ser desfeita.`)) return
  deletingAccount.value = account.id
  try {
    await $fetch(`/api/admin/meta/accounts/${account.id}`, { method: 'DELETE' })
    toast.add({ title: 'Número removido com sucesso', color: 'success' })
    if (selectedAccount.value?.id === account.id) {
      selectedAccount.value = null
      templates.value = []
      selectedAgentId.value = undefined
    }
    await refreshAccounts()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao remover número'
    toast.add({ title: msg, color: 'error' })
  } finally {
    deletingAccount.value = null
  }
}

// ─── Account selection ────────────────────────────────────────────────────────

const selectedAccount = ref<MetaAccount | null>(null)
const selectedAgentId = ref<string | undefined>(undefined)

const agentOptions = computed(() =>
  (selectedAccount.value?.agent_configs ?? []).map(a => ({ label: a.name, value: a.id }))
)

const activeAgentId = computed(() => selectedAgentId.value ?? selectedAccount.value?.agent_configs[0]?.id ?? null)

async function selectAccount(account: MetaAccount) {
  selectedAccount.value = account
  selectedAgentId.value = account.agent_configs[0]?.id ?? undefined
  await loadAllAgents()
  if (selectedAgentId.value) {
    await loadTemplates(selectedAgentId.value)
  } else {
    templates.value = []
  }
}

watch(selectedAgentId, async (agentId) => {
  if (agentId) await loadTemplates(agentId)
  else templates.value = []
})

// ─── Agent linking ────────────────────────────────────────────────────────────

interface AgentOption { id: string; name: string }

const allAgents = ref<AgentOption[]>([])
const selectedNewAgentId = ref<string | undefined>(undefined)
const linkingAgent = ref(false)
const unlinkingAgentId = ref<string | null>(null)

const linkableAgentOptions = computed(() => {
  const linkedIds = new Set((selectedAccount.value?.agent_configs ?? []).map(a => a.id))
  return allAgents.value
    .filter(a => !linkedIds.has(a.id))
    .map(a => ({ label: a.name, value: a.id }))
})

async function loadAllAgents() {
  try {
    const res = await $fetch<{ data: AgentOption[] }>('/api/admin/agents')
    allAgents.value = res.data.map(a => ({ id: a.id, name: a.name }))
  } catch {
    allAgents.value = []
  }
}

async function handleLinkAgent() {
  if (!selectedAccount.value || !selectedNewAgentId.value) return

  linkingAgent.value = true
  try {
    // @ts-expect-error — Nitro types regenerated after nuxt prepare; new POST routes not yet indexed
    await $fetch(`/api/admin/meta/accounts/${selectedAccount.value.id}/link-agent`, { method: 'POST', body: { agent_id: selectedNewAgentId.value } })
    toast.add({ title: 'Agente vinculado com sucesso', color: 'success' })
    selectedNewAgentId.value = undefined
    await refreshAccounts()
    // Re-seleciona a conta atualizada
    const updated = accountsData.value?.data.find(a => a.id === selectedAccount.value!.id)
    if (updated) await selectAccount(updated)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao vincular agente'
    toast.add({ title: msg, color: 'error' })
  } finally {
    linkingAgent.value = false
  }
}

async function handleUnlinkAgent(agentId: string) {
  if (!selectedAccount.value) return
  unlinkingAgentId.value = agentId
  try {
    // @ts-expect-error — Nitro types regenerated after nuxt prepare; new POST routes not yet indexed
    await $fetch(`/api/admin/meta/accounts/${selectedAccount.value.id}/unlink-agent`, { method: 'POST', body: { agent_id: agentId } })
    toast.add({ title: 'Agente desvinculado', color: 'success' })
    if (selectedAgentId.value === agentId) {
      selectedAgentId.value = undefined
      templates.value = []
    }
    await refreshAccounts()
    const updated = accountsData.value?.data.find(a => a.id === selectedAccount.value!.id)
    if (updated) selectedAccount.value = updated
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao desvincular agente'
    toast.add({ title: msg, color: 'error' })
  } finally {
    unlinkingAgentId.value = null
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

const templates = ref<Template[]>([])
const loadingTemplates = ref(false)
const showNewTemplateModal = ref(false)
const deletingTemplate = ref<string | null>(null)

const newTemplate = reactive({
  name: '',
  category: 'UTILITY' as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
  language: 'pt_BR',
  bodyText: ''
})
const creatingTemplate = ref(false)

const categoryOptions = [
  { label: 'Utilitário', value: 'UTILITY' },
  { label: 'Marketing', value: 'MARKETING' },
  { label: 'Autenticação', value: 'AUTHENTICATION' }
]

const languageOptions = [
  { label: 'Português (Brasil)', value: 'pt_BR' },
  { label: 'English (US)', value: 'en_US' },
  { label: 'Español', value: 'es' }
]

type BadgeColor = 'success' | 'warning' | 'error' | 'neutral'
const templateStatusColor: Record<string, BadgeColor> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'error',
  DISABLED: 'neutral',
  IN_APPEAL: 'warning',
  PAUSED: 'neutral'
}

async function loadTemplates(agentId: string) {
  loadingTemplates.value = true
  templates.value = []
  try {
    const res = await $fetch<{ data: Template[] }>(`/api/admin/whatsapp/templates?agent_id=${agentId}`)
    templates.value = res.data
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao carregar templates'
    toast.add({ title: msg, color: 'error' })
  } finally {
    loadingTemplates.value = false
  }
}

async function handleCreateTemplate() {
  if (!activeAgentId.value || !newTemplate.name || !newTemplate.bodyText) return
  creatingTemplate.value = true
  try {
    await $fetch('/api/admin/whatsapp/templates', {
      method: 'POST',
      body: {
        agent_id: activeAgentId.value,
        name: newTemplate.name.toLowerCase().replace(/\s+/g, '_'),
        category: newTemplate.category,
        language: newTemplate.language,
        components: [{ type: 'BODY', text: newTemplate.bodyText }]
      }
    })
    toast.add({ title: 'Template enviado para aprovação', color: 'success' })
    showNewTemplateModal.value = false
    newTemplate.name = ''
    newTemplate.bodyText = ''
    await loadTemplates(activeAgentId.value)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao criar template'
    toast.add({ title: msg, color: 'error' })
  } finally {
    creatingTemplate.value = false
  }
}

async function handleDeleteTemplate(templateName: string) {
  if (!activeAgentId.value) return
  deletingTemplate.value = templateName
  try {
    await $fetch('/api/admin/whatsapp/templates', {
      method: 'DELETE',
      body: { agent_id: activeAgentId.value, template_name: templateName }
    })
    toast.add({ title: 'Template excluído', color: 'success' })
    templates.value = templates.value.filter(t => t.name !== templateName)
  } catch {
    toast.add({ title: 'Falha ao excluir template', color: 'error' })
  } finally {
    deletingTemplate.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-message-circle" class="text-(--ui-primary)" />
          WhatsApp Business
        </h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">
          Gerencie contas do WhatsApp Business (Meta) e templates de mensagem.
        </p>
      </div>
    </div>

    <!-- Empty state: no accounts at all -->
    <div v-if="accounts.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="p-5 rounded-full bg-(--ui-bg-accented) mb-4">
        <UIcon name="i-lucide-smartphone" class="text-5xl text-(--ui-text-dimmed)" />
      </div>
      <h2 class="text-lg font-semibold mb-1">Nenhum número conectado</h2>
      <p class="text-sm text-(--ui-text-muted) mb-6 max-w-xs">
        Conecte seu primeiro número do WhatsApp Business para começar a gerenciar templates e atendimentos.
      </p>
      <UButton icon="i-lucide-plus" @click="showConnectModal = true">
        Conectar primeiro número
      </UButton>
    </div>

    <!-- Main layout: left column + right column -->
    <div v-else class="flex gap-6 min-h-0">
      <!-- Left column: account list -->
      <div class="w-80 shrink-0 space-y-4">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-smartphone" class="text-lg" />
                <span class="font-medium">Números Conectados</span>
                <UBadge
                  :label="String(accounts.length)"
                  size="sm"
                  color="success"
                  variant="subtle"
                />
              </div>
              <UButton
                size="xs"
                variant="ghost"
                icon="i-lucide-plus"
                aria-label="Conectar novo número"
                @click="showConnectModal = true"
              />
            </div>
          </template>

          <div class="space-y-2">
            <div
              v-for="account in accounts"
              :key="account.id"
              :class="[
                'group relative flex flex-col gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
                selectedAccount?.id === account.id
                  ? 'border-(--ui-primary) bg-(--ui-primary)/5'
                  : 'border-(--ui-border) hover:bg-(--ui-bg-elevated)'
              ]"
              @click="selectAccount(account)"
            >
              <!-- Account header row -->
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold truncate">
                    {{ account.verified_name ?? account.display_phone_number ?? 'Número sem nome' }}
                  </div>
                  <div class="text-xs text-(--ui-text-muted) font-mono mt-0.5">
                    {{ account.display_phone_number ?? '—' }}
                  </div>
                </div>
                <UButton
                  variant="ghost"
                  color="error"
                  size="xs"
                  icon="i-lucide-trash-2"
                  :loading="deletingAccount === account.id"
                  class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  aria-label="Remover número"
                  @click.stop="handleDeleteAccount(account)"
                />
              </div>

              <!-- WABA ID -->
              <div class="text-xs text-(--ui-text-dimmed) font-mono">
                WABA: {{ account.waba_id }}
              </div>

              <!-- Linked agents badges -->
              <div class="flex flex-wrap gap-1">
                <template v-if="account.agent_configs.length > 0">
                  <UBadge
                    v-for="agent in account.agent_configs"
                    :key="agent.id"
                    :label="agent.name"
                    size="xs"
                    variant="subtle"
                    color="primary"
                  />
                </template>
                <UBadge
                  v-else
                  label="Sem agente vinculado"
                  size="xs"
                  variant="subtle"
                  color="neutral"
                />
              </div>
            </div>
          </div>

          <template #footer>
            <UButton
              block
              variant="soft"
              icon="i-lucide-plus"
              @click="showConnectModal = true"
            >
              Conectar novo número
            </UButton>
          </template>
        </UCard>

        <!-- Info box -->
        <UCard class="bg-(--ui-bg-elevated)">
          <div class="flex gap-2 text-sm">
            <UIcon name="i-lucide-info" class="text-(--ui-primary) shrink-0 mt-0.5" />
            <div class="text-(--ui-text-muted) space-y-1">
              <p>Selecione uma conta para gerenciar seus <strong>templates de mensagem</strong>.</p>
              <p>Templates precisam de aprovação da Meta (normalmente até 24h).</p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Right column: agent linking + template management -->
      <div class="flex-1 min-w-0 space-y-4">
        <!-- No account selected -->
        <div v-if="!selectedAccount" class="flex flex-col items-center justify-center h-64 text-center">
          <div class="p-5 rounded-full bg-(--ui-bg-accented) mb-4">
            <UIcon name="i-lucide-mouse-pointer-click" class="text-4xl text-(--ui-text-dimmed)" />
          </div>
          <p class="text-(--ui-text-muted) text-sm">
            Selecione uma conta na lista para gerenciar templates.
          </p>
        </div>

        <!-- Account selected: agent management card -->
        <UCard v-else>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-bot" class="text-lg" />
              <span class="font-medium">Agentes Vinculados</span>
              <UBadge
                :label="String(selectedAccount.agent_configs.length)"
                size="sm"
                variant="subtle"
                :color="selectedAccount.agent_configs.length > 0 ? 'success' : 'neutral'"
              />
            </div>
          </template>

          <div class="space-y-4">
            <!-- Linked agents list -->
            <div v-if="selectedAccount.agent_configs.length > 0" class="space-y-2">
              <div
                v-for="agent in selectedAccount.agent_configs"
                :key="agent.id"
                class="flex items-center justify-between p-3 rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated)"
              >
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-bot" class="text-(--ui-primary)" />
                  <span class="text-sm font-medium">{{ agent.name }}</span>
                </div>
                <UButton
                  variant="ghost"
                  color="error"
                  size="xs"
                  icon="i-lucide-unlink"
                  :loading="unlinkingAgentId === agent.id"
                  aria-label="Desvincular agente"
                  @click="handleUnlinkAgent(agent.id)"
                />
              </div>
            </div>

            <div v-else class="text-sm text-(--ui-text-muted) py-2">
              Nenhum agente vinculado. Adicione um agente abaixo.
            </div>

            <!-- Link new agent -->
            <div class="flex gap-2 items-center pt-2 border-t border-(--ui-border)">
              <USelect
                v-model="selectedNewAgentId"
                :items="linkableAgentOptions"
                value-key="value"
                label-key="label"
                placeholder="Selecionar agente..."
                class="flex-1"
                size="sm"
              />
              <UButton
                size="sm"
                icon="i-lucide-link"
                :loading="linkingAgent"
                :disabled="!selectedNewAgentId"
                @click="handleLinkAgent"
              >
                Vincular
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- Templates section (only when agents are linked) -->
        <UCard v-if="selectedAccount && selectedAccount.agent_configs.length > 0">
          <template #header>
            <div class="flex items-center justify-between gap-4 flex-wrap">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-layout-template" class="text-lg" />
                <span class="font-medium">Templates</span>
                <UBadge
                  v-if="templates.length > 0"
                  :label="String(templates.length)"
                  size="sm"
                  variant="subtle"
                />
              </div>

              <div class="flex items-center gap-3">
                <!-- Agent selector when multiple agents are linked -->
                <USelect
                  v-if="agentOptions.length > 1"
                  v-model="selectedAgentId"
                  :items="agentOptions"
                  value-key="value"
                  label-key="label"
                  size="sm"
                  class="w-48"
                  aria-label="Selecionar agente"
                />
                <!-- Single agent label -->
                <span v-else class="text-sm text-(--ui-text-muted)">
                  {{ selectedAccount.agent_configs[0]?.name }}
                </span>

                <UButton
                  size="sm"
                  icon="i-lucide-plus"
                  @click="showNewTemplateModal = true"
                >
                  Novo Template
                </UButton>
              </div>
            </div>
          </template>

          <!-- Loading -->
          <div v-if="loadingTemplates" class="flex justify-center py-10">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-(--ui-text-dimmed)" />
          </div>

          <!-- Empty templates -->
          <div v-else-if="templates.length === 0" class="text-center py-10">
            <UIcon name="i-lucide-layout-template" class="text-3xl text-(--ui-text-dimmed) mb-3" />
            <p class="text-(--ui-text-muted) text-sm">Nenhum template criado ainda.</p>
            <UButton
              size="sm"
              variant="soft"
              class="mt-3"
              @click="showNewTemplateModal = true"
            >
              Criar primeiro template
            </UButton>
          </div>

          <!-- Template list -->
          <div v-else class="space-y-3">
            <div
              v-for="tmpl in templates"
              :key="tmpl.id"
              class="flex items-start justify-between p-4 rounded-lg border border-(--ui-border)"
            >
              <div class="flex-1 min-w-0 space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-medium text-sm font-mono">{{ tmpl.name }}</span>
                  <UBadge
                    :color="templateStatusColor[tmpl.status] ?? 'neutral'"
                    variant="subtle"
                    size="xs"
                  >
                    {{ tmpl.status }}
                  </UBadge>
                  <UBadge variant="outline" size="xs" color="neutral">
                    {{ tmpl.category }}
                  </UBadge>
                  <UBadge variant="outline" size="xs" color="neutral">
                    {{ tmpl.language }}
                  </UBadge>
                </div>

                <!-- Body preview -->
                <div
                  v-for="comp in (tmpl.components as Array<{ type: string; text?: string }>).filter(c => c.type === 'BODY')"
                  :key="comp.type"
                  class="text-xs text-(--ui-text-muted) line-clamp-2"
                >
                  {{ comp.text }}
                </div>
              </div>

              <UButton
                variant="ghost"
                color="error"
                size="xs"
                icon="i-lucide-trash-2"
                :loading="deletingTemplate === tmpl.name"
                class="ml-2 shrink-0"
                aria-label="Excluir template"
                @click="handleDeleteTemplate(tmpl.name)"
              />
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Modal: Connect new account -->
    <UModal
      v-model:open="showConnectModal"
      title="Conectar WhatsApp Business"
    >
      <template #body>
        <AdminMetaConnect @connected="onAccountConnected" />
      </template>
    </UModal>

    <!-- Modal: New Template -->
    <UModal
      v-model:open="showNewTemplateModal"
      title="Criar Template de Mensagem"
    >
      <template #body>
        <div class="space-y-4">
          <UAlert
            icon="i-lucide-info"
            color="info"
            variant="subtle"
            description="Templates precisam de aprovação da Meta. Use nomes em minúsculas com underscores (ex: boas_vindas)."
          />

          <UFormField label="Nome do Template">
            <UInput
              v-model="newTemplate.name"
              placeholder="ex: boas_vindas"
              class="w-full font-mono"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Categoria">
              <USelect
                v-model="newTemplate.category"
                :items="categoryOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Idioma">
              <USelect
                v-model="newTemplate.language"
                :items="languageOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField label="Corpo da Mensagem">
            <UTextarea
              v-model="newTemplate.bodyText"
              :rows="5"
              placeholder="Olá {{1}}, sua solicitação foi recebida com sucesso!"
              class="w-full"
            />
            <template #hint>
              Use <code class="text-xs bg-(--ui-bg-elevated) px-1 rounded">&#123;&#123;1&#125;&#125;</code>,
              <code class="text-xs bg-(--ui-bg-elevated) px-1 rounded">&#123;&#123;2&#125;&#125;</code> para variáveis dinâmicas.
            </template>
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showNewTemplateModal = false">
            Cancelar
          </UButton>
          <UButton
            :loading="creatingTemplate"
            :disabled="!newTemplate.name || !newTemplate.bodyText"
            @click="handleCreateTemplate"
          >
            Criar e Enviar para Aprovação
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
