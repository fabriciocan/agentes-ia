<script setup lang="ts">
const { isSidebarCollapsed } = useDashboard()
const { data: session } = await useFetch('/api/auth/session')
const { can } = usePermissions()
const route = useRoute()

// Check if user is platform admin
const isPlatformAdmin = computed(() => {
  return session.value?.user?.email?.includes('superadmin@platform.com') ||
         session.value?.user?.email?.includes('@platform.')
})

// Fetch company data for logo and name (only for non-platform admins)
const { data: companyData } = useFetch('/api/admin/company', {
  server: false,
  immediate: true,
  onResponseError: () => {} // silently ignore errors (platform admin has no company)
})
const companyLogoUrl = computed(() => (companyData.value as Record<string, unknown> | null)?.logo_url as string | null ?? null)
const companyName = computed(() => (companyData.value as Record<string, unknown> | null)?.name as string | null ?? null)

// Navigation for regular admins (Usuários hidden if no users.read permission)
const adminNavigation = computed(() => [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/admin' },
  { label: 'Agentes', icon: 'i-lucide-bot', to: '/admin/agents' },
  { label: 'WhatsApp', icon: 'i-lucide-message-circle', to: '/admin/whatsapp' },
  { label: 'Conversas', icon: 'i-lucide-message-square', to: '/admin/conversations' },
  ...(can('users.read') ? [{ label: 'Usuários', icon: 'i-lucide-users', to: '/admin/users' }] : []),
  ...(can('company.update') ? [{ label: 'Configurações', icon: 'i-lucide-settings-2', to: '/admin/settings' }] : [])
])

// Navigation for platform admins
const platformNavigation = [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/platform' },
  { label: 'Empresas', icon: 'i-lucide-building-2', to: '/platform/companies' },
  { label: 'Agentes', icon: 'i-lucide-bot', to: '/platform/agents' },
  { label: 'Usuários', icon: 'i-lucide-users', to: '/platform/users' },
  { label: 'Analytics', icon: 'i-lucide-bar-chart-3', to: '/platform/analytics' },
  { label: 'Configurações', icon: 'i-lucide-settings', to: '/platform/settings' },
  { label: '---', icon: '', to: '' },
  { label: 'Admin da Empresa', icon: 'i-lucide-user-cog', to: '/admin' }
]

const navigation = computed(() => isPlatformAdmin.value ? platformNavigation : adminNavigation.value)

function isActive(to: string) {
  if (!to || to === '---') return false
  if (to === '/admin') return route.path === '/admin'
  if (to === '/platform') return route.path === '/platform'
  return route.path.startsWith(to)
}
</script>

<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <aside
      :class="[
        'border-r border-(--ui-border) bg-(--ui-bg-elevated) flex flex-col transition-all duration-200 shrink-0',
        isSidebarCollapsed ? 'w-16' : 'w-64'
      ]"
    >
      <!-- Header -->
      <div class="p-4 border-b border-(--ui-border) flex items-center gap-3">
        <template v-if="!isSidebarCollapsed">
          <AppLogo :logo-url="companyLogoUrl" class="w-7 h-7 shrink-0" />
          <h1 class="font-bold text-lg truncate">
            {{ companyName || 'AI Agents' }}
          </h1>
        </template>
        <AppLogo
          v-else
          :logo-url="companyLogoUrl"
          class="w-7 h-7 mx-auto"
        />
      </div>

      <!-- Collapse toggle -->
      <div class="px-3 pt-3">
        <UButton
          :icon="isSidebarCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
          variant="ghost"
          color="neutral"
          size="sm"
          :block="!isSidebarCollapsed"
          :class="isSidebarCollapsed ? 'mx-auto' : 'justify-start'"
          @click="isSidebarCollapsed = !isSidebarCollapsed"
        >
          <span v-if="!isSidebarCollapsed">Collapse</span>
        </UButton>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-3 space-y-1">
        <template v-for="item in navigation" :key="item.to">
          <!-- Divider -->
          <div v-if="item.label === '---'" class="border-t border-(--ui-border) my-2" />

          <!-- Navigation Item -->
          <UTooltip
            v-else
            :text="item.label"
            :delay-duration="300"
            side="right"
            :disabled="!isSidebarCollapsed"
          >
            <NuxtLink
              :to="item.to"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full',
                isActive(item.to)
                  ? 'bg-(--ui-bg-accented) text-(--ui-text-highlighted) font-medium'
                  : 'text-(--ui-text-muted) hover:bg-(--ui-bg-accented) hover:text-(--ui-text-highlighted)'
              ]"
            >
              <UIcon
                :name="item.icon"
                class="text-lg shrink-0"
              />
              <span
                v-if="!isSidebarCollapsed"
                class="truncate"
              >{{ item.label }}</span>
            </NuxtLink>
          </UTooltip>
        </template>
      </nav>

      <!-- User Menu Footer -->
      <div class="p-3 border-t border-(--ui-border)">
        <UserMenu :collapsed="isSidebarCollapsed" />
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Page Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <slot />
      </div>
    </main>
  </div>
</template>
