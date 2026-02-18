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
  client: { id: string; name: string; slug: string }
  stats: { userCount: number; agentCount: number; conversationCount: number }
}

const { data: companiesData } = await useFetch('/api/platform/companies')

const companies = computed(() => (companiesData.value?.companies || []) as CompanyRow[])

const columns = [
  { key: 'name', label: 'Company Name', sortable: true },
  { key: 'client.name', label: 'Client', sortable: true },
  { key: 'stats.userCount', label: 'Users', sortable: true },
  { key: 'stats.agentCount', label: 'Agents', sortable: true },
  { key: 'stats.conversationCount', label: 'Conversations', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'actions', label: 'Actions' }
] as const

type BadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

// Type cast helper for UTable slot rows
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
          All Companies
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Manage all companies across the platform
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-lucide-plus"
        size="lg"
      >
        Add Company
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
            Total Companies
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-3xl font-bold text-green-600">
            {{ companies.reduce((sum, c) => sum + c.stats.userCount, 0) }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total Users
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-3xl font-bold text-purple-600">
            {{ companies.reduce((sum, c) => sum + c.stats.agentCount, 0) }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total Agents
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-3xl font-bold text-orange-600">
            {{ companies.reduce((sum, c) => sum + c.stats.conversationCount, 0) }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total Conversations
          </p>
        </div>
      </UCard>
    </div>

    <!-- Companies Table -->
    <UCard>
      <UTable
        :columns="(columns as any)"
        :rows="(companies as any[])"
        :loading="!companiesData"
      >
        <template #name-data="{ row }">
          <div class="flex items-center gap-3">
            <UAvatar
              v-if="asRow(row).logoUrl"
              :src="asRow(row).logoUrl || undefined"
              :alt="asRow(row).name"
              size="sm"
            />
            <UAvatar
              v-else
              :alt="asRow(row).name"
              size="sm"
            />
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ asRow(row).name }}
              </p>
              <p class="text-sm text-gray-500">
                {{ asRow(row).slug }}
              </p>
            </div>
          </div>
        </template>

        <template #client.name-data="{ row }">
          <div>
            <p class="font-medium text-gray-700 dark:text-gray-300">
              {{ asRow(row).client.name }}
            </p>
            <p class="text-xs text-gray-500">
              {{ asRow(row).client.slug }}
            </p>
          </div>
        </template>

        <template #stats.userCount-data="{ row }">
          <UBadge color="primary" variant="subtle">
            {{ asRow(row).stats.userCount }}
          </UBadge>
        </template>

        <template #stats.agentCount-data="{ row }">
          <UBadge color="secondary" variant="subtle">
            {{ asRow(row).stats.agentCount }}
          </UBadge>
        </template>

        <template #stats.conversationCount-data="{ row }">
          <UBadge color="success" variant="subtle">
            {{ asRow(row).stats.conversationCount }}
          </UBadge>
        </template>

        <template #status-data="{ row }">
          <UBadge
            :color="getStatusColor(asRow(row).status)"
            variant="subtle"
          >
            {{ asRow(row).status }}
          </UBadge>
        </template>

        <template #actions-data="{ row }">
          <UButton
            icon="i-lucide-external-link"
            size="xs"
            color="neutral"
            variant="ghost"
            :to="`/platform/companies/${asRow(row).id}`"
          >
            View
          </UButton>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
