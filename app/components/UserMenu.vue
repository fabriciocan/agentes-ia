<script setup lang="ts">
const props = defineProps<{
  collapsed?: boolean
}>()

const colorMode = useColorMode()
const { data: session } = await useFetch('/api/auth/session')
const { applyTheme, saveTheme, PRIMARY_COLORS, NEUTRAL_COLORS, COLOR_HEX } = useCompanyTheme()

const userEmail = computed(() => session.value?.user?.email || 'Admin')
const userInitial = computed(() => userEmail.value.charAt(0).toUpperCase())

const appConfig = useAppConfig()
const toast = useToast()

const showThemePanel = ref(false)
const savingTheme = ref(false)

async function setPrimaryColor(color: string) {
  appConfig.ui.colors.primary = color
  await persistTheme()
}

async function setNeutralColor(color: string) {
  appConfig.ui.colors.neutral = color
  await persistTheme()
}

async function toggleColorMode() {
  const newMode = colorMode.value === 'dark' ? 'light' : 'dark'
  colorMode.preference = newMode
  await persistTheme()
}

async function persistTheme() {
  if (savingTheme.value) return
  savingTheme.value = true
  try {
    const company = await $fetch<Record<string, unknown>>('/api/admin/company')
    const currentSettings = (company?.settings as Record<string, unknown>) || {}
    await saveTheme({
      primaryColor: appConfig.ui.colors.primary as string,
      neutralColor: appConfig.ui.colors.neutral as string,
      colorMode: colorMode.preference as 'light' | 'dark'
    }, currentSettings)
  } catch {
    // silently fail — theme is still applied locally
  } finally {
    savingTheme.value = false
  }
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
    label: 'Tema',
    icon: 'i-lucide-palette',
    onSelect: () => {
      showThemePanel.value = !showThemePanel.value
    }
  }, {
    label: colorMode.value === 'dark' ? 'Light Mode' : 'Dark Mode',
    icon: colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon',
    onSelect: () => toggleColorMode()
  }],
  [{
    label: 'Logout',
    icon: 'i-lucide-log-out',
    onSelect: () => logout()
  }]
])
</script>

<template>
  <div>
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

    <!-- Theme Panel -->
    <div
      v-if="showThemePanel && !collapsed"
      class="mt-2 p-3 rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) space-y-3"
    >
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">Cor Principal</p>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="color in PRIMARY_COLORS"
          :key="color"
          class="w-6 h-6 rounded-full transition-all flex items-center justify-center"
          :class="appConfig.ui.colors.primary === color
            ? 'ring-2 ring-offset-2 ring-white/70 scale-110'
            : 'hover:scale-110 opacity-80 hover:opacity-100'"
          :style="{ backgroundColor: COLOR_HEX[color] }"
          :title="color"
          @click="setPrimaryColor(color)"
        >
          <span v-if="appConfig.ui.colors.primary === color" class="block w-2 h-2 rounded-full bg-white/90" />
        </button>
      </div>

      <div>
        <p class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-2">Cor Neutra</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="color in NEUTRAL_COLORS"
            :key="color"
            class="w-6 h-6 rounded-full transition-all flex items-center justify-center"
            :class="appConfig.ui.colors.neutral === color
              ? 'ring-2 ring-offset-2 ring-white/70 scale-110'
              : 'hover:scale-110 opacity-80 hover:opacity-100'"
            :style="{ backgroundColor: COLOR_HEX[color] }"
            :title="color"
            @click="setNeutralColor(color)"
          >
            <span v-if="appConfig.ui.colors.neutral === color" class="block w-2 h-2 rounded-full bg-white/90" />
          </button>
        </div>
      </div>

      <p class="text-xs text-(--ui-text-muted) italic">Tema salvo para esta empresa</p>
    </div>
  </div>
</template>
