<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const { data: session } = await useFetch('/api/auth/session')
const { data: analytics } = await useFetch('/api/platform/analytics')

const stats = computed(() => analytics.value?.stats || {
  totalCompanies: 0,
  totalUsers: 0,
  totalAgents: 0,
  totalConversations: 0,
  totalMessages: 0
})

const statCards = computed(() => [
  {
    title: 'Total Companies',
    value: stats.value.totalCompanies,
    icon: 'i-lucide-building-2',
    color: 'text-blue-600',
    description: 'Active companies on platform'
  },
  {
    title: 'Total Users',
    value: stats.value.totalUsers,
    icon: 'i-lucide-users',
    color: 'text-green-600',
    description: 'Users across all companies'
  },
  {
    title: 'Total Agents',
    value: stats.value.totalAgents,
    icon: 'i-lucide-bot',
    color: 'text-purple-600',
    description: 'AI agents deployed'
  },
  {
    title: 'Conversations',
    value: stats.value.totalConversations,
    icon: 'i-lucide-message-square',
    color: 'text-orange-600',
    description: 'Total conversations'
  },
  {
    title: 'Messages',
    value: stats.value.totalMessages,
    icon: 'i-lucide-messages-square',
    color: 'text-pink-600',
    description: 'Total messages processed'
  }
])

const recentActivity = computed(() => (analytics.value?.recentActivity || []) as Array<{ companyName: string; conversationsToday: number; messagesToday: number }>)
const companiesByStatus = computed(() => (analytics.value?.companiesByStatus || []) as Array<{ status: string; count: number }>)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Platform Dashboard
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Global overview across all companies
        </p>
      </div>
      <UBadge color="secondary" variant="subtle" size="lg">
        Platform Admin
      </UBadge>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <UCard
        v-for="stat in statCards"
        :key="stat.title"
        class="hover:shadow-lg transition-shadow"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {{ stat.title }}
            </p>
            <p class="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {{ stat.value.toLocaleString() }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500">
              {{ stat.description }}
            </p>
          </div>
          <div :class="['text-2xl', stat.color]">
            <UIcon :name="stat.icon" class="w-8 h-8" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Recent Activity -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Activity Today -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Activity Today</h2>
        </template>

        <div v-if="recentActivity.length > 0" class="space-y-3">
          <div
            v-for="activity in recentActivity"
            :key="activity.companyName"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div class="flex-1">
              <p class="font-medium text-gray-900 dark:text-white">
                {{ activity.companyName }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ activity.conversationsToday }} conversations
              </p>
            </div>
            <div class="text-right">
              <p class="text-lg font-semibold text-blue-600">
                {{ activity.messagesToday }}
              </p>
              <p class="text-xs text-gray-500">messages</p>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8 text-gray-500">
          No activity today
        </div>
      </UCard>

      <!-- Quick Actions -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Quick Actions</h2>
        </template>

        <div class="space-y-3">
          <NuxtLink to="/platform/analytics">
            <UButton
              block
              color="primary"
              variant="soft"
              icon="i-lucide-bar-chart-3"
              size="lg"
            >
              Detailed Analytics
            </UButton>
          </NuxtLink>

          <NuxtLink to="/platform/users">
            <UButton
              block
              color="success"
              variant="soft"
              icon="i-lucide-users"
              size="lg"
            >
              View All Users
            </UButton>
          </NuxtLink>

          <NuxtLink to="/platform/settings">
            <UButton
              block
              color="secondary"
              variant="soft"
              icon="i-lucide-settings"
              size="lg"
            >
              System Settings
            </UButton>
          </NuxtLink>

          <NuxtLink to="/admin">
            <UButton
              block
              color="neutral"
              variant="soft"
              icon="i-lucide-user-cog"
              size="lg"
            >
              Company Admin
            </UButton>
          </NuxtLink>
        </div>
      </UCard>
    </div>

    <!-- Companies by Status -->
    <UCard class="mt-6" v-if="companiesByStatus.length > 0">
      <template #header>
        <h2 class="text-lg font-semibold">Companies by Status</h2>
      </template>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-for="status in companiesByStatus"
          :key="status.status"
          class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ status.count }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 capitalize">
            {{ status.status }}
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
