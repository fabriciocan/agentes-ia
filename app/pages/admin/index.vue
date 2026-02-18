<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const { data: session } = await useFetch('/api/auth/session')

const { data: statsData } = await useFetch('/api/admin/stats')
const stats = computed(() => statsData.value || {
  totalAgents: 0,
  activeConversations: 0,
  totalMessages: 0,
  knowledgeItems: 0
})

const statCards = computed(() => [
  {
    title: 'Total Agents',
    value: stats.value.totalAgents,
    icon: 'i-lucide-bot',
    color: 'text-(--ui-primary)'
  },
  {
    title: 'Conversations',
    value: stats.value.activeConversations,
    icon: 'i-lucide-message-square',
    color: 'text-(--ui-primary)'
  },
  {
    title: 'Total Messages',
    value: stats.value.totalMessages,
    icon: 'i-lucide-messages-square',
    color: 'text-(--ui-primary)'
  },
  {
    title: 'Knowledge Items',
    value: stats.value.knowledgeItems,
    icon: 'i-lucide-book-open',
    color: 'text-(--ui-primary)'
  }
])
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">
          Dashboard
        </h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">
          Welcome back, {{ session?.user?.email || 'Admin' }}
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        to="/admin/agents"
      >
        New Agent
      </UButton>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <UCard
        v-for="stat in statCards"
        :key="stat.title"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-(--ui-text-muted)">
              {{ stat.title }}
            </p>
            <p class="text-3xl font-bold mt-1">
              {{ stat.value }}
            </p>
          </div>
          <div class="p-3 rounded-lg bg-(--ui-bg-accented)">
            <UIcon
              :name="stat.icon"
              :class="['text-2xl', stat.color]"
            />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Quick Actions -->
    <h2 class="text-lg font-semibold mb-4">
      Quick Actions
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-bot"
              class="text-lg"
            />
            <span class="font-medium">Agents</span>
          </div>
        </template>
        <p class="text-(--ui-text-muted) text-sm mb-4">
          Configure your AI agents, prompts, and behavior.
        </p>
        <template #footer>
          <UButton
            to="/admin/agents"
            variant="outline"
            size="sm"
            block
          >
            Manage Agents
          </UButton>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-message-square"
              class="text-lg"
            />
            <span class="font-medium">Conversations</span>
          </div>
        </template>
        <p class="text-(--ui-text-muted) text-sm mb-4">
          View and manage customer conversations.
        </p>
        <template #footer>
          <UButton
            to="/admin/conversations"
            variant="outline"
            size="sm"
            block
          >
            View Conversations
          </UButton>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-user"
              class="text-lg"
            />
            <span class="font-medium">Account</span>
          </div>
        </template>
        <p class="text-(--ui-text-muted) text-sm mb-4">
          Logged in as {{ session?.user?.email || 'Admin' }}
        </p>
      </UCard>
    </div>
  </div>
</template>
