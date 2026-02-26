<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

interface CompanyRow {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  status: string
  createdAt: string
  updatedAt: string
  stats: { userCount: number; agentCount: number; conversationCount: number }
}

const { data: companiesData, refresh } = await useFetch('/api/platform/companies')

const companies = computed(() => (companiesData.value?.companies || []) as CompanyRow[])
const toast = useToast()

// ─── Create company modal ───────────────────────────────────────────────────
const showCreateModal = ref(false)
const creating = ref(false)
const createForm = reactive({
  name: '',
  slug: '',
  logo_url: '',
  admin_email: '',
  admin_name: ''
})

watch(() => createForm.name, (name) => {
  createForm.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
})

function resetCreateForm() {
  createForm.name = ''
  createForm.slug = ''
  createForm.logo_url = ''
  createForm.admin_email = ''
  createForm.admin_name = ''
}

// ─── Provisional password result modal ─────────────────────────────────────
const showPasswordModal = ref(false)
const createdResult = ref<{ companyName: string; adminEmail: string; provisionalPassword: string } | null>(null)
const passwordCopied = ref(false)

function copyPassword() {
  if (!createdResult.value) return
  navigator.clipboard.writeText(createdResult.value.provisionalPassword)
  passwordCopied.value = true
  setTimeout(() => { passwordCopied.value = false }, 2000)
}

async function createCompany() {
  if (!createForm.name || !createForm.slug || !createForm.admin_email) return
  creating.value = true
  try {
    const result = await $fetch('/api/platform/companies', {
      method: 'POST',
      body: {
        name: createForm.name,
        slug: createForm.slug,
        logo_url: createForm.logo_url || null,
        admin_email: createForm.admin_email,
        admin_name: createForm.admin_name || undefined
      }
    }) as { company: { name: string }; adminUser: { email: string }; provisionalPassword: string }

    createdResult.value = {
      companyName: result.company.name,
      adminEmail: result.adminUser.email,
      provisionalPassword: result.provisionalPassword
    }
    showCreateModal.value = false
    showPasswordModal.value = true
    resetCreateForm()
    await refresh()
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string } }
    toast.add({
      title: 'Erro ao criar empresa',
      description: err.data?.statusMessage || 'Tente novamente',
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}

const columns = [
  { id: 'name', accessorKey: 'name', header: 'Empresa' },
  { id: 'userCount', accessorKey: 'userCount', header: 'Usuários' },
  { id: 'agentCount', accessorKey: 'agentCount', header: 'Agentes' },
  { id: 'conversationCount', accessorKey: 'conversationCount', header: 'Conversas' },
  { id: 'status', accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: 'Ações' }
]

type BadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

function asRow(row: unknown): CompanyRow { return row as CompanyRow }

const getStatusColor = (status: string): BadgeColor => {
  switch (status) {
    case 'active': return 'success'
    case 'suspended': return 'warning'
    case 'deleted': return 'error'
    default: return 'neutral'
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Empresas
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Gerencie todas as empresas da plataforma
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-lucide-plus"
        size="lg"
        @click="showCreateModal = true"
      >
        Nova Empresa
      </UButton>
    </div>

    <!-- Stats Summary -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <UCard>
        <div class="text-center">
          <p class="text-3xl font-bold text-blue-600">
            {{ companies.length }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total de Empresas
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-3xl font-bold text-green-600">
            {{ companies.reduce((sum, c) => sum + c.stats.userCount, 0) }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total de Usuários
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-3xl font-bold text-purple-600">
            {{ companies.reduce((sum, c) => sum + c.stats.agentCount, 0) }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total de Agentes
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-3xl font-bold text-orange-600">
            {{ companies.reduce((sum, c) => sum + c.stats.conversationCount, 0) }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total de Conversas
          </p>
        </div>
      </UCard>
    </div>

    <!-- Companies Table -->
    <UCard>
      <UTable
        :columns="columns"
        :data="(companies as any[])"
        :loading="!companiesData"
      >
        <template #name-cell="{ row }">
          <div class="flex items-center gap-3">
            <UAvatar
              v-if="asRow(row.original).logoUrl"
              :src="asRow(row.original).logoUrl || undefined"
              :alt="asRow(row.original).name"
              size="sm"
            />
            <UAvatar
              v-else
              :alt="asRow(row.original).name"
              size="sm"
            />
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ asRow(row.original).name }}
              </p>
              <p class="text-sm text-gray-500">
                {{ asRow(row.original).slug }}
              </p>
            </div>
          </div>
        </template>

        <template #userCount-cell="{ row }">
          <UBadge color="primary" variant="subtle">
            {{ asRow(row.original).stats.userCount }}
          </UBadge>
        </template>

        <template #agentCount-cell="{ row }">
          <UBadge color="secondary" variant="subtle">
            {{ asRow(row.original).stats.agentCount }}
          </UBadge>
        </template>

        <template #conversationCount-cell="{ row }">
          <UBadge color="success" variant="subtle">
            {{ asRow(row.original).stats.conversationCount }}
          </UBadge>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :color="getStatusColor(asRow(row.original).status)"
            variant="subtle"
          >
            {{ asRow(row.original).status }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <UButton
            icon="i-lucide-external-link"
            size="xs"
            color="neutral"
            variant="ghost"
            :to="`/platform/companies/${asRow(row.original).id}`"
          >
            Ver
          </UButton>
        </template>
      </UTable>
    </UCard>

    <!-- Create Company Modal -->
    <UModal v-model:open="showCreateModal" title="Nova Empresa">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Nome da Empresa" required>
            <UInput
              v-model="createForm.name"
              placeholder="Ex: Acme Corp"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Slug (URL)" required>
            <UInput
              v-model="createForm.slug"
              placeholder="acme-corp"
              size="lg"
              class="w-full"
            />
            <template #hint>
              Apenas letras minúsculas, números e hífens
            </template>
          </UFormField>

          <UFormField label="Logo URL (opcional)">
            <UInput
              v-model="createForm.logo_url"
              placeholder="https://exemplo.com/logo.png"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <div class="border-t border-(--ui-border) pt-4">
            <p class="text-sm font-medium text-(--ui-text) mb-3">
              Admin da Empresa
            </p>

            <div class="space-y-3">
              <UFormField label="E-mail do Admin" required>
                <UInput
                  v-model="createForm.admin_email"
                  type="email"
                  placeholder="admin@empresa.com"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Nome do Admin (opcional)">
                <UInput
                  v-model="createForm.admin_name"
                  placeholder="Nome completo"
                  size="lg"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            variant="ghost"
            color="neutral"
            @click="showCreateModal = false; resetCreateForm()"
          >
            Cancelar
          </UButton>
          <UButton
            color="primary"
            :loading="creating"
            :disabled="!createForm.name || !createForm.slug || !createForm.admin_email"
            @click="createCompany"
          >
            Criar Empresa
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Provisional Password Modal -->
    <UModal v-model:open="showPasswordModal" title="Empresa Criada com Sucesso">
      <template #body>
        <div v-if="createdResult" class="space-y-4">
          <div class="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <UIcon name="i-lucide-check-circle-2" class="text-green-600 text-xl shrink-0" />
            <div>
              <p class="font-medium text-green-800 dark:text-green-300">
                {{ createdResult.companyName }} criada com sucesso!
              </p>
              <p class="text-sm text-green-700 dark:text-green-400">
                Admin: {{ createdResult.adminEmail }}
              </p>
            </div>
          </div>

          <div class="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <div class="flex items-start gap-2 mb-3">
              <UIcon name="i-lucide-alert-triangle" class="text-amber-600 text-lg shrink-0 mt-0.5" />
              <p class="text-sm font-medium text-amber-800 dark:text-amber-300">
                Senha provisória — exibida apenas uma vez
              </p>
            </div>
            <p class="text-sm text-amber-700 dark:text-amber-400 mb-3">
              Copie e compartilhe esta senha com o administrador da empresa. Ela não será exibida novamente.
            </p>
            <div class="flex items-center gap-2">
              <code class="flex-1 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-600 rounded px-3 py-2 font-mono text-lg font-bold tracking-wider text-gray-900 dark:text-white">
                {{ createdResult.provisionalPassword }}
              </code>
              <UButton
                :icon="passwordCopied ? 'i-lucide-check' : 'i-lucide-copy'"
                :color="passwordCopied ? 'success' : 'neutral'"
                variant="outline"
                size="sm"
                @click="copyPassword"
              >
                {{ passwordCopied ? 'Copiado!' : 'Copiar' }}
              </UButton>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end">
          <UButton
            color="primary"
            @click="showPasswordModal = false; createdResult = null"
          >
            Entendido
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
