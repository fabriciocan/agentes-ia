<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const route = useRoute()
const id = route.params.id as string

const { data, pending } = await useFetch(`/api/platform/companies/${id}`)

const company = computed(() => data.value?.company)
const users = computed(() => data.value?.users || [])
const agents = computed(() => data.value?.agents || [])

type BadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

const getStatusColor = (status: string | null | undefined): BadgeColor => {
  switch (status) {
    case 'active': return 'success'
    case 'suspended': return 'warning'
    case 'deleted': return 'error'
    default: return 'neutral'
  }
}

function formatDate(date: string | null | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

const userColumns = [
  { id: 'email', accessorKey: 'email', header: 'Usuário' },
  { id: 'status', accessorKey: 'status', header: 'Status' },
  { id: 'last_login_at', accessorKey: 'last_login_at', header: 'Último Login' },
  { id: 'created_at', accessorKey: 'created_at', header: 'Criado em' }
]

const agentColumns = [
  { id: 'name', accessorKey: 'name', header: 'Nome' },
  { id: 'model', accessorKey: 'model', header: 'Modelo' },
  { id: 'is_active', accessorKey: 'is_active', header: 'Status' },
  { id: 'created_at', accessorKey: 'created_at', header: 'Criado em' }
]

function getUserStatusColor(status: string): BadgeColor {
  const map: Record<string, BadgeColor> = {
    active: 'success', invited: 'primary', suspended: 'warning', deleted: 'error'
  }
  return map[status] || 'neutral'
}

function getUserStatusLabel(status: string) {
  const map: Record<string, string> = {
    active: 'Ativo', invited: 'Convidado', suspended: 'Suspenso', deleted: 'Deletado'
  }
  return map[status] || status
}
</script>

<template>
  <div>
    <!-- Back -->
    <div class="mb-4">
      <UButton
        to="/platform/companies"
        variant="ghost"
        color="neutral"
        icon="i-lucide-arrow-left"
        size="sm"
      >
        Voltar para Empresas
      </UButton>
    </div>

    <div v-if="pending" class="flex justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <template v-else-if="company">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <UAvatar
          :src="company.logoUrl || undefined"
          :alt="company.name"
          size="lg"
        />
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ company.name }}
          </h1>
          <p class="text-gray-500 text-sm mt-0.5">
            {{ company.slug }} · Cliente: <span class="font-medium">{{ company.client.name }}</span>
          </p>
        </div>
        <div class="ml-auto">
          <UBadge :color="getStatusColor(company.status)" variant="subtle" size="lg">
            {{ company.status }}
          </UBadge>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <UCard>
          <div class="text-center">
            <p class="text-3xl font-bold text-blue-600">{{ company.stats.userCount }}</p>
            <p class="text-sm text-gray-500 mt-1">Usuários</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-3xl font-bold text-purple-600">{{ company.stats.agentCount }}</p>
            <p class="text-sm text-gray-500 mt-1">Agentes</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-3xl font-bold text-orange-600">{{ company.stats.conversationCount }}</p>
            <p class="text-sm text-gray-500 mt-1">Conversas</p>
          </div>
        </UCard>
      </div>

      <!-- Info -->
      <UCard class="mb-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p class="text-muted font-medium mb-1">Cliente</p>
            <p>{{ company.client.name }}</p>
          </div>
          <div>
            <p class="text-muted font-medium mb-1">Slug</p>
            <p class="font-mono">{{ company.slug }}</p>
          </div>
          <div>
            <p class="text-muted font-medium mb-1">Criado em</p>
            <p>{{ formatDate(company.createdAt) }}</p>
          </div>
          <div>
            <p class="text-muted font-medium mb-1">Atualizado em</p>
            <p>{{ formatDate(company.updatedAt) }}</p>
          </div>
        </div>
      </UCard>

      <!-- Users -->
      <UCard class="mb-6">
        <template #header>
          <h2 class="text-lg font-semibold">Usuários</h2>
        </template>
        <UTable :columns="userColumns" :data="users">
          <template #email-cell="{ row }">
            <div>
              <p class="font-medium">{{ row.original.name || 'Sem nome' }}</p>
              <p class="text-sm text-muted">{{ row.original.email }}</p>
            </div>
          </template>
          <template #status-cell="{ row }">
            <UBadge :color="getUserStatusColor(row.original.status)" variant="subtle">
              {{ getUserStatusLabel(row.original.status) }}
            </UBadge>
          </template>
          <template #last_login_at-cell="{ row }">
            <span class="text-sm text-muted">{{ formatDate(row.original.last_login_at) }}</span>
          </template>
          <template #created_at-cell="{ row }">
            <span class="text-sm text-muted">{{ formatDate(row.original.created_at) }}</span>
          </template>
        </UTable>
        <div v-if="users.length === 0" class="text-center py-8 text-gray-500">
          <p>Nenhum usuário</p>
        </div>
      </UCard>

      <!-- Agents -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Agentes</h2>
        </template>
        <UTable :columns="agentColumns" :data="agents">
          <template #name-cell="{ row }">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-bot" class="text-primary shrink-0" />
              <span class="font-medium">{{ row.original.name }}</span>
            </div>
          </template>
          <template #model-cell="{ row }">
            <span class="text-sm font-mono text-gray-600 dark:text-gray-400">{{ row.original.model }}</span>
          </template>
          <template #is_active-cell="{ row }">
            <UBadge :color="row.original.is_active ? 'success' : 'neutral'" variant="subtle">
              {{ row.original.is_active ? 'Ativo' : 'Inativo' }}
            </UBadge>
          </template>
          <template #created_at-cell="{ row }">
            <span class="text-sm text-muted">{{ formatDate(row.original.created_at) }}</span>
          </template>
        </UTable>
        <div v-if="agents.length === 0" class="text-center py-8 text-gray-500">
          <p>Nenhum agente</p>
        </div>
      </UCard>
    </template>

    <div v-else class="text-center py-20 text-gray-500">
      <UIcon name="i-lucide-building-2" class="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p>Empresa não encontrada</p>
    </div>
  </div>
</template>
