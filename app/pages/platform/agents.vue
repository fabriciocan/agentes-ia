<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

interface CompanyOption {
  id: string
  name: string
  slug: string
}

interface AgentRow {
  id: string
  name: string
  is_active: boolean
  model: string
  created_at: string
  company_id: string | null
  companies: { id: string; name: string; slug: string } | null
}

const { data: companiesData } = await useFetch('/api/platform/companies')
const companies = computed(() => (companiesData.value?.companies || []) as CompanyOption[])

const selectedCompanyId = ref('all')
const companyOptions = computed(() => [
  { label: 'Todas as empresas', value: 'all' },
  ...companies.value.map(c => ({ label: c.name, value: c.id }))
])

const { data: agentsData, refresh, pending } = await useFetch('/api/admin/agents')
const agents = computed(() => (agentsData.value?.data || []) as AgentRow[])

watch(selectedCompanyId, async (companyId) => {
  const url = companyId && companyId !== 'all' ? `/api/admin/agents?company_id=${companyId}` : '/api/admin/agents'
  const result = await $fetch(url) as { data: AgentRow[] }
  agentsData.value = result as typeof agentsData.value
})

const columns = [
  { id: 'name', accessorKey: 'name', header: 'Agente' },
  { id: 'companies', accessorKey: 'companies', header: 'Empresa' },
  { id: 'model', accessorKey: 'model', header: 'Modelo' },
  { id: 'is_active', accessorKey: 'is_active', header: 'Status' },
  { id: 'created_at', accessorKey: 'created_at', header: 'Criado em' }
]

function asRow(row: unknown): AgentRow { return row as AgentRow }

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Agentes
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Visualize agentes de todas as empresas da plataforma
        </p>
      </div>
      <UBadge color="primary" variant="subtle" size="lg">
        {{ agents.length }} agente{{ agents.length !== 1 ? 's' : '' }}
      </UBadge>
    </div>

    <!-- Filter -->
    <div class="mb-6">
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

    <!-- Agents Table -->
    <UCard>
      <UTable
        :columns="columns"
        :data="(agents as any[])"
        :loading="pending"
      >
        <template #name-cell="{ row }">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-bot" class="text-primary shrink-0" />
            <span class="font-medium">{{ asRow(row.original).name }}</span>
          </div>
        </template>

        <template #companies-cell="{ row }">
          <div v-if="asRow(row.original).companies">
            <p class="font-medium text-gray-700 dark:text-gray-300">
              {{ asRow(row.original).companies!.name }}
            </p>
            <p class="text-xs text-gray-500">
              {{ asRow(row.original).companies!.slug }}
            </p>
          </div>
          <span v-else class="text-muted text-sm">Sem empresa</span>
        </template>

        <template #model-cell="{ row }">
          <span class="text-sm font-mono text-gray-600 dark:text-gray-400">
            {{ asRow(row.original).model }}
          </span>
        </template>

        <template #is_active-cell="{ row }">
          <UBadge
            :color="asRow(row.original).is_active ? 'success' : 'neutral'"
            variant="subtle"
          >
            {{ asRow(row.original).is_active ? 'Ativo' : 'Inativo' }}
          </UBadge>
        </template>

        <template #created_at-cell="{ row }">
          <span class="text-sm text-gray-600 dark:text-gray-400">
            {{ formatDate(asRow(row.original).created_at) }}
          </span>
        </template>
      </UTable>

      <div
        v-if="!pending && agents.length === 0"
        class="text-center py-12 text-gray-500"
      >
        <UIcon name="i-lucide-bot" class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum agente encontrado</p>
      </div>
    </UCard>
  </div>
</template>
