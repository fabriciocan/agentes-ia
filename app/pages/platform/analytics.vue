<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const { data: analytics } = await useFetch('/api/platform/analytics')

const stats = computed(() => analytics.value?.stats || {
  totalCompanies: 0,
  totalUsers: 0,
  totalAgents: 0,
  totalConversations: 0,
  totalMessages: 0
})

const recentActivity = computed(() => (analytics.value?.recentActivity || []) as Array<{ companyName: string; conversationsToday: number; messagesToday: number }>)
const companiesByStatus = computed(() => (analytics.value?.companiesByStatus || []) as Array<{ status: string; count: number }>)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        Platform Analytics
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mt-1">
        Detailed analytics and insights across all companies
      </p>
    </div>

    <!-- Main Stats -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
      <UCard>
        <div class="text-center">
          <UIcon name="i-lucide-building-2" class="w-8 h-8 mx-auto mb-2 text-blue-600" />
          <p class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ stats.totalCompanies }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Companies
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <UIcon name="i-lucide-users" class="w-8 h-8 mx-auto mb-2 text-green-600" />
          <p class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ stats.totalUsers }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Users
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <UIcon name="i-lucide-bot" class="w-8 h-8 mx-auto mb-2 text-purple-600" />
          <p class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ stats.totalAgents }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Agents
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <UIcon name="i-lucide-message-square" class="w-8 h-8 mx-auto mb-2 text-orange-600" />
          <p class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ stats.totalConversations }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Conversations
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <UIcon name="i-lucide-messages-square" class="w-8 h-8 mx-auto mb-2 text-pink-600" />
          <p class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ stats.totalMessages.toLocaleString() }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Messages
          </p>
        </div>
      </UCard>
    </div>

    <!-- Charts and Activity -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Companies by Status -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Companies by Status</h2>
        </template>

        <div class="space-y-4">
          <div
            v-for="status in companiesByStatus"
            :key="status.status"
            class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'w-3 h-3 rounded-full',
                  status.status === 'active' ? 'bg-green-500' :
                  status.status === 'suspended' ? 'bg-orange-500' : 'bg-red-500'
                ]"
              />
              <span class="font-medium capitalize text-gray-900 dark:text-white">
                {{ status.status }}
              </span>
            </div>
            <span class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ status.count }}
            </span>
          </div>
        </div>
      </UCard>

      <!-- Most Active Companies -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Most Active Today</h2>
        </template>

        <div v-if="recentActivity.length > 0" class="space-y-3">
          <div
            v-for="(activity, index) in recentActivity.slice(0, 5)"
            :key="activity.companyName"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <span class="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {{ index + 1 }}
                </span>
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ activity.companyName }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ activity.conversationsToday }} conversations
                </p>
              </div>
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
    </div>

    <!-- Average Stats -->
    <UCard class="mt-6">
      <template #header>
        <h2 class="text-lg font-semibold">Platform Averages</h2>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="text-center p-4">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ stats.totalCompanies > 0 ? Math.round(stats.totalUsers / stats.totalCompanies) : 0 }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Users per Company
          </p>
        </div>

        <div class="text-center p-4">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ stats.totalCompanies > 0 ? Math.round(stats.totalAgents / stats.totalCompanies) : 0 }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Agents per Company
          </p>
        </div>

        <div class="text-center p-4">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ stats.totalAgents > 0 ? Math.round(stats.totalConversations / stats.totalAgents) : 0 }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Conversations per Agent
          </p>
        </div>

        <div class="text-center p-4">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ stats.totalConversations > 0 ? Math.round(stats.totalMessages / stats.totalConversations) : 0 }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Messages per Conversation
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
