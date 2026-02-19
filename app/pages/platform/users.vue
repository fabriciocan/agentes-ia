<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

interface UserRow {
  id: string
  email: string
  name: string | null
  status: string
  avatar_url: string | null
  last_login_at: string | null
  created_at: string
  company: { id: string; name: string; slug: string } | null
  roles: { id: string; name: string; slug: string }[]
}

interface CompanyOption {
  id: string
  name: string
  slug: string
}

const toast = useToast()

// Companies for filter dropdown
const { data: companiesData } = await useFetch('/api/platform/companies')
const companies = computed(() => (companiesData.value?.companies || []) as CompanyOption[])

// Filters
const selectedCompanyId = ref('')
const search = ref('')

const companyOptions = computed(() => [
  { label: 'Todas as empresas', value: '' },
  ...companies.value.map(c => ({ label: c.name, value: c.id }))
])

// Build URL with filters
const usersUrl = computed(() => {
  const params = new URLSearchParams()
  if (selectedCompanyId.value) params.set('company_id', selectedCompanyId.value)
  if (search.value) params.set('search', search.value)
  const qs = params.toString()
  return qs ? `/api/platform/users?${qs}` : '/api/platform/users'
})

const { data: usersData, refresh, pending } = await useFetch(usersUrl, {
  watch: [selectedCompanyId, search]
})

const users = computed(() => (usersData.value?.data || []) as UserRow[])

// Stats
const totalActive = computed(() => users.value.filter(u => u.status === 'active').length)
const totalInvited = computed(() => users.value.filter(u => u.status === 'invited').length)
const totalSuspended = computed(() => users.value.filter(u => u.status === 'suspended').length)

// Status badge
function getStatusColor(status: string): 'success' | 'primary' | 'warning' | 'error' | 'neutral' {
  const map: Record<string, 'success' | 'primary' | 'warning' | 'error' | 'neutral'> = {
    active: 'success', invited: 'primary', suspended: 'warning', deleted: 'error'
  }
  return map[status] || 'neutral'
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    active: 'Ativo', invited: 'Convidado', suspended: 'Suspenso', deleted: 'Deletado'
  }
  return map[status] || status
}

function formatDate(date: string | null) {
  if (!date) return 'Nunca'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

// Columns for UTable
const columns = [
  { key: 'name', label: 'Usuário', sortable: true },
  { key: 'company', label: 'Empresa', sortable: true },
  { key: 'roles', label: 'Perfis' },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'last_login_at', label: 'Último Login', sortable: true },
  { key: 'actions', label: 'Ações' }
] as const

function asRow(row: unknown): UserRow { return row as UserRow }

// ─── Edit user status ────────────────────────────────────────────────────────
const editingUser = ref<UserRow | null>(null)
const isEditModalOpen = ref(false)
const editStatus = ref('active')
const savingEdit = ref(false)

function openEditModal(user: UserRow) {
  editingUser.value = user
  editStatus.value = user.status
  isEditModalOpen.value = true
}

async function saveUserStatus() {
  if (!editingUser.value) return
  savingEdit.value = true
  try {
    await $fetch(`/api/platform/users/${editingUser.value.id}`, {
      method: 'PATCH',
      body: { status: editStatus.value }
    })
    toast.add({ title: 'Usuário atualizado', color: 'success' })
    isEditModalOpen.value = false
    await refresh()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string } }
    toast.add({
      title: 'Erro ao atualizar',
      description: err.data?.message || 'Tente novamente',
      color: 'error'
    })
  } finally {
    savingEdit.value = false
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Usuários
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Todos os usuários da plataforma
        </p>
      </div>
      <UBadge color="primary" variant="subtle" size="lg">
        {{ users.length }} usuário{{ users.length !== 1 ? 's' : '' }}
      </UBadge>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-(--ui-text-muted)">Total</p>
            <p class="text-2xl font-bold">{{ users.length }}</p>
          </div>
          <UIcon name="i-lucide-users" class="w-8 h-8 text-(--ui-primary)" />
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-(--ui-text-muted)">Ativos</p>
            <p class="text-2xl font-bold">{{ totalActive }}</p>
          </div>
          <UIcon name="i-lucide-check-circle" class="w-8 h-8 text-green-600" />
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-(--ui-text-muted)">Convidados</p>
            <p class="text-2xl font-bold">{{ totalInvited }}</p>
          </div>
          <UIcon name="i-lucide-mail" class="w-8 h-8 text-(--ui-primary)" />
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-(--ui-text-muted)">Suspensos</p>
            <p class="text-2xl font-bold">{{ totalSuspended }}</p>
          </div>
          <UIcon name="i-lucide-alert-circle" class="w-8 h-8 text-orange-600" />
        </div>
      </UCard>
    </div>

    <!-- Filters -->
    <div class="flex flex-col md:flex-row gap-3 mb-6">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Buscar por nome ou e-mail..."
        size="lg"
        class="flex-1"
      />
      <USelect
        v-model="selectedCompanyId"
        :items="companyOptions"
        value-key="value"
        placeholder="Filtrar por empresa"
        size="lg"
        icon="i-lucide-building-2"
        class="w-72"
      />
    </div>

    <!-- Users Table -->
    <UCard>
      <UTable
        :columns="(columns as any)"
        :rows="(users as any[])"
        :loading="pending"
      >
        <!-- Usuário column -->
        <template #name-data="{ row }">
          <div class="flex items-center gap-3">
            <UAvatar
              :alt="asRow(row).name || asRow(row).email"
              :src="asRow(row).avatar_url || undefined"
              size="sm"
            />
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ asRow(row).name || 'Sem nome' }}
              </p>
              <p class="text-sm text-(--ui-text-muted)">{{ asRow(row).email }}</p>
            </div>
          </div>
        </template>

        <!-- Empresa column -->
        <template #company-data="{ row }">
          <div v-if="asRow(row).company">
            <p class="font-medium text-gray-700 dark:text-gray-300">
              {{ asRow(row).company!.name }}
            </p>
            <p class="text-xs text-(--ui-text-muted)">{{ asRow(row).company!.slug }}</p>
          </div>
          <span v-else class="text-(--ui-text-muted) text-sm italic">Sem empresa</span>
        </template>

        <!-- Perfis column -->
        <template #roles-data="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="role in asRow(row).roles.slice(0, 2)"
              :key="role.id"
              color="primary"
              variant="subtle"
              size="xs"
            >
              {{ role.name }}
            </UBadge>
            <UBadge
              v-if="asRow(row).roles.length > 2"
              color="neutral"
              variant="subtle"
              size="xs"
            >
              +{{ asRow(row).roles.length - 2 }}
            </UBadge>
            <span v-if="asRow(row).roles.length === 0" class="text-xs text-(--ui-text-muted)">
              Sem perfil
            </span>
          </div>
        </template>

        <!-- Status column -->
        <template #status-data="{ row }">
          <UBadge :color="getStatusColor(asRow(row).status)" variant="subtle">
            {{ getStatusLabel(asRow(row).status) }}
          </UBadge>
        </template>

        <!-- Último Login column -->
        <template #last_login_at-data="{ row }">
          <span class="text-sm text-(--ui-text-muted)">
            {{ formatDate(asRow(row).last_login_at) }}
          </span>
        </template>

        <!-- Ações column -->
        <template #actions-data="{ row }">
          <UButton
            icon="i-lucide-pencil"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="openEditModal(asRow(row))"
          >
            Editar
          </UButton>
        </template>
      </UTable>

      <div
        v-if="!pending && users.length === 0"
        class="text-center py-12 text-gray-500"
      >
        <UIcon name="i-lucide-users" class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum usuário encontrado</p>
      </div>
    </UCard>

    <!-- Edit User Modal -->
    <UModal v-model:open="isEditModalOpen" title="Editar Usuário">
      <template #body>
        <div v-if="editingUser" class="space-y-4">
          <!-- User info summary -->
          <div class="flex items-center gap-3 p-3 bg-(--ui-bg-elevated) rounded-lg">
            <UAvatar
              :alt="editingUser.name || editingUser.email"
              :src="editingUser.avatar_url || undefined"
              size="md"
            />
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ editingUser.name || 'Sem nome' }}
              </p>
              <p class="text-sm text-(--ui-text-muted)">{{ editingUser.email }}</p>
              <p v-if="editingUser.company" class="text-xs text-(--ui-text-muted)">
                {{ editingUser.company.name }}
              </p>
            </div>
          </div>

          <!-- Status select -->
          <UFormField label="Status" required>
            <USelect
              v-model="editStatus"
              :items="[
                { label: 'Ativo', value: 'active' },
                { label: 'Convidado', value: 'invited' },
                { label: 'Suspenso', value: 'suspended' }
              ]"
              value-key="value"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <!-- Status hint -->
          <UAlert
            v-if="editStatus === 'suspended'"
            color="warning"
            variant="subtle"
            icon="i-lucide-alert-triangle"
            title="Atenção"
            description="O usuário não conseguirá acessar a plataforma enquanto estiver suspenso."
          />
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            variant="ghost"
            color="neutral"
            @click="isEditModalOpen = false"
          >
            Cancelar
          </UButton>
          <UButton
            color="primary"
            :loading="savingEdit"
            @click="saveUserStatus"
          >
            Salvar
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
