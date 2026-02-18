<script setup lang="ts">
const props = defineProps<{
  collapsed?: boolean
}>()

const colorMode = useColorMode()
const { data: session } = await useFetch('/api/auth/session')

const userEmail = computed(() => session.value?.user?.email || 'Admin')
const userInitial = computed(() => userEmail.value.charAt(0).toUpperCase())

const primaryColors = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
  'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple',
  'fuchsia', 'pink', 'rose'
]
const neutralColors = ['slate', 'gray', 'zinc', 'neutral', 'stone']

const appConfig = useAppConfig()

function setPrimaryColor(color: string) {
  appConfig.ui.colors.primary = color
}

function setNeutralColor(color: string) {
  appConfig.ui.colors.neutral = color
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  navigateTo('/login')
}

const items = computed(() => [
  [{
    label: userEmail.value,
    type: 'label' as const
  }],
  [{
    label: colorMode.value === 'dark' ? 'Light Mode' : 'Dark Mode',
    icon: colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon',
    onSelect: () => {
      colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
    }
  }],
  [{
    label: 'Logout',
    icon: 'i-lucide-log-out',
    onSelect: () => logout()
  }]
])
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      :variant="'ghost'"
      color="neutral"
      :block="!collapsed"
      :class="collapsed ? '' : 'justify-start'"
    >
      <template #leading>
        <UAvatar
          :text="userInitial"
          size="2xs"
        />
      </template>
      <span v-if="!collapsed" class="truncate text-sm">{{ userEmail }}</span>
    </UButton>
  </UDropdownMenu>
</template>
