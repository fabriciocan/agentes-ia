<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const toast = useToast()
const { can } = usePermissions()
const { applyTheme, saveTheme, getThemeFromCompany, PRIMARY_COLORS, NEUTRAL_COLORS, COLOR_HEX } = useCompanyTheme()
const appConfig = useAppConfig()
const colorMode = useColorMode()

const { data: companyData, refresh } = await useFetch('/api/admin/company')

const form = reactive({
  name: '',
  slug: '',
  logo_url: ''
})
const saving = ref(false)
const savingTheme = ref(false)

// Theme form state
const themeForm = reactive({
  primaryColor: 'green',
  neutralColor: 'slate',
  colorMode: 'dark' as 'light' | 'dark'
})

// Populate form when data loads
watch(companyData, (data) => {
  if (!data) return
  const company = data as Record<string, unknown>
  form.name = (company.name as string) || ''
  form.slug = (company.slug as string) || ''
  form.logo_url = (company.logo_url as string) || ''

  // Load theme from company settings
  const theme = getThemeFromCompany(company)
  themeForm.primaryColor = theme.primaryColor || (appConfig.ui.colors.primary as string) || 'green'
  themeForm.neutralColor = theme.neutralColor || (appConfig.ui.colors.neutral as string) || 'slate'
  themeForm.colorMode = theme.colorMode || (colorMode.preference as 'light' | 'dark') || 'dark'
}, { immediate: true })

const logoPreview = computed(() => form.logo_url || null)

async function saveSettings() {
  if (!can('company.update')) return
  saving.value = true
  try {
    await $fetch('/api/admin/company/settings', {
      method: 'PATCH',
      body: {
        name: form.name || undefined,
        slug: form.slug || undefined,
        logo_url: form.logo_url || null
      }
    })
    toast.add({ title: 'Configurações salvas', color: 'success' })
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Erro ao salvar',
      description: error.data?.message || 'Tente novamente',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

function previewTheme() {
  applyTheme({
    primaryColor: themeForm.primaryColor,
    neutralColor: themeForm.neutralColor,
    colorMode: themeForm.colorMode
  })
}

async function saveThemeSettings() {
  if (!can('company.update')) return
  savingTheme.value = true
  try {
    // Apply locally first
    applyTheme({
      primaryColor: themeForm.primaryColor,
      neutralColor: themeForm.neutralColor,
      colorMode: themeForm.colorMode
    })

    // Fetch current settings to merge
    const company = companyData.value as Record<string, unknown> | null
    const currentSettings = (company?.settings as Record<string, unknown>) || {}

    await $fetch('/api/admin/company/settings', {
      method: 'PATCH',
      body: {
        settings: {
          ...currentSettings,
          theme: {
            primaryColor: themeForm.primaryColor,
            neutralColor: themeForm.neutralColor,
            colorMode: themeForm.colorMode
          }
        }
      }
    })
    toast.add({ title: 'Tema salvo', description: 'O tema será aplicado para todos da empresa', color: 'success' })
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Erro ao salvar tema',
      description: error.data?.message || 'Tente novamente',
      color: 'error'
    })
  } finally {
    savingTheme.value = false
  }
}

const company = computed(() => companyData.value as Record<string, unknown> | null)

// Color label map
const colorLabels: Record<string, string> = {
  red: 'Vermelho', orange: 'Laranja', amber: 'Âmbar', yellow: 'Amarelo',
  lime: 'Lima', green: 'Verde', emerald: 'Esmeralda', teal: 'Teal',
  cyan: 'Ciano', sky: 'Céu', blue: 'Azul', indigo: 'Índigo',
  violet: 'Violeta', purple: 'Roxo', fuchsia: 'Fúcsia', pink: 'Rosa',
  rose: 'Rosé', slate: 'Ardósia', gray: 'Cinza', zinc: 'Zinco',
  neutral: 'Neutro', stone: 'Pedra'
}
</script>

<template>
  <div class="max-w-2xl">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        Configurações da Empresa
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mt-1">
        Personalize as informações e aparência da sua empresa
      </p>
    </div>

    <div v-if="!can('company.update')" class="mb-6">
      <UAlert
        color="warning"
        icon="i-lucide-lock"
        title="Acesso restrito"
        description="Você não tem permissão para alterar as configurações da empresa."
      />
    </div>

    <!-- Company Info Card -->
    <UCard class="mb-6">
      <template #header>
        <h2 class="text-lg font-semibold">Informações da Empresa</h2>
      </template>

      <div class="space-y-4">
        <UFormField label="Nome da Empresa">
          <UInput
            v-model="form.name"
            placeholder="Nome da empresa"
            size="lg"
            class="w-full"
            :disabled="!can('company.update')"
          />
        </UFormField>

        <UFormField label="Slug (URL)">
          <UInput
            v-model="form.slug"
            placeholder="nome-da-empresa"
            size="lg"
            class="w-full"
            :disabled="!can('company.update')"
          />
          <template #hint>
            Usado na URL da empresa. Apenas letras minúsculas, números e hífens.
          </template>
        </UFormField>
      </div>
    </UCard>

    <!-- Logo Card -->
    <UCard class="mb-6">
      <template #header>
        <h2 class="text-lg font-semibold">Logo da Empresa</h2>
      </template>

      <div class="space-y-4">
        <UFormField label="URL da Logo">
          <UInput
            v-model="form.logo_url"
            placeholder="https://exemplo.com/logo.png"
            size="lg"
            class="w-full"
            :disabled="!can('company.update')"
          />
          <template #hint>
            A logo será exibida no topo do menu lateral. Recomendamos uma imagem quadrada ou landscape em PNG/SVG.
          </template>
        </UFormField>

        <!-- Logo Preview -->
        <div class="flex items-center gap-6">
          <div>
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">Preview no sidebar</p>
            <div class="w-10 h-10 border border-(--ui-border) rounded-lg flex items-center justify-center bg-(--ui-bg-elevated) overflow-hidden">
              <img
                v-if="logoPreview"
                :src="logoPreview"
                alt="Logo preview"
                class="w-full h-full object-contain"
              />
              <UIcon
                v-else
                name="i-lucide-image"
                class="text-(--ui-text-muted) text-xl"
              />
            </div>
          </div>
          <div v-if="logoPreview" class="text-sm text-(--ui-text-muted)">
            <p>Logo personalizada ativa</p>
            <p class="text-xs mt-1">A imagem acima será exibida no menu</p>
          </div>
          <div v-else class="text-sm text-(--ui-text-muted)">
            <p>Usando logo padrão do sistema</p>
            <p class="text-xs mt-1">Insira uma URL para personalizar</p>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Save Info Button -->
    <div v-if="can('company.update')" class="flex justify-end mb-6">
      <UButton
        size="lg"
        :loading="saving"
        icon="i-lucide-save"
        @click="saveSettings"
      >
        Salvar Informações
      </UButton>
    </div>

    <!-- Theme Card -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-palette" class="text-lg" />
          <h2 class="text-lg font-semibold">Tema da Empresa</h2>
        </div>
        <p class="text-sm text-(--ui-text-muted) mt-1">
          O tema ficará vinculado a esta empresa. Ao fazer login com outra empresa, o tema correspondente será carregado automaticamente.
        </p>
      </template>

      <div class="space-y-6">
        <!-- Color Mode -->
        <div>
          <p class="text-sm font-medium mb-3">Modo de Exibição</p>
          <div class="flex gap-3">
            <button
              v-for="mode in (['light', 'dark'] as const)"
              :key="mode"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium"
              :class="themeForm.colorMode === mode
                ? 'border-(--ui-primary) bg-(--ui-primary)/10 text-(--ui-primary)'
                : 'border-(--ui-border) hover:border-(--ui-primary)/50'"
              :disabled="!can('company.update')"
              @click="themeForm.colorMode = mode; previewTheme()"
            >
              <UIcon :name="mode === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'" />
              {{ mode === 'dark' ? 'Dark Mode' : 'Light Mode' }}
            </button>
          </div>
        </div>

        <!-- Primary Color -->
        <div>
          <p class="text-sm font-medium mb-3">
            Cor Principal
            <span class="ml-2 text-(--ui-text-muted) font-normal">— {{ colorLabels[themeForm.primaryColor] || themeForm.primaryColor }}</span>
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="color in PRIMARY_COLORS"
              :key="color"
              class="w-7 h-7 rounded-full transition-all flex items-center justify-center"
              :class="themeForm.primaryColor === color
                ? 'ring-2 ring-offset-2 ring-white/70 scale-110'
                : 'hover:scale-110 opacity-75 hover:opacity-100'"
              :style="{ backgroundColor: COLOR_HEX[color] }"
              :title="colorLabels[color] || color"
              :disabled="!can('company.update')"
              @click="themeForm.primaryColor = color; previewTheme()"
            >
              <UIcon
                v-if="themeForm.primaryColor === color"
                name="i-lucide-check"
                class="text-white text-xs drop-shadow"
              />
            </button>
          </div>
        </div>

        <!-- Neutral Color -->
        <div>
          <p class="text-sm font-medium mb-3">
            Cor Neutra
            <span class="ml-2 text-(--ui-text-muted) font-normal">— {{ colorLabels[themeForm.neutralColor] || themeForm.neutralColor }}</span>
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="color in NEUTRAL_COLORS"
              :key="color"
              class="w-7 h-7 rounded-full transition-all flex items-center justify-center"
              :class="themeForm.neutralColor === color
                ? 'ring-2 ring-offset-2 ring-white/70 scale-110'
                : 'hover:scale-110 opacity-75 hover:opacity-100'"
              :style="{ backgroundColor: COLOR_HEX[color] }"
              :title="colorLabels[color] || color"
              :disabled="!can('company.update')"
              @click="themeForm.neutralColor = color; previewTheme()"
            >
              <UIcon
                v-if="themeForm.neutralColor === color"
                name="i-lucide-check"
                class="text-white text-xs drop-shadow"
              />
            </button>
          </div>
        </div>

        <!-- Preview note -->
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Preview em tempo real"
          description="As cores são aplicadas imediatamente para prévia. Clique em 'Salvar Tema' para persistir para todos os usuários desta empresa."
        />
      </div>

      <template v-if="can('company.update')" #footer>
        <div class="flex justify-end">
          <UButton
            size="lg"
            :loading="savingTheme"
            icon="i-lucide-palette"
            @click="saveThemeSettings"
          >
            Salvar Tema
          </UButton>
        </div>
      </template>
    </UCard>

    <!-- Stats Card (read-only) -->
    <UCard v-if="company" class="mb-6">
      <template #header>
        <h2 class="text-lg font-semibold">Informações da Conta</h2>
      </template>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p class="text-(--ui-text-muted)">Status</p>
          <UBadge
            :color="company.status === 'active' ? 'success' : 'warning'"
            variant="subtle"
            class="mt-1"
          >
            {{ company.status === 'active' ? 'Ativa' : company.status }}
          </UBadge>
        </div>
        <div>
          <p class="text-(--ui-text-muted)">Usuários</p>
          <p class="font-medium mt-1">{{ (company.stats as any)?.user_count || 0 }}</p>
        </div>
        <div>
          <p class="text-(--ui-text-muted)">Agentes</p>
          <p class="font-medium mt-1">{{ (company.stats as any)?.agent_count || 0 }}</p>
        </div>
        <div>
          <p class="text-(--ui-text-muted)">Conversas este mês</p>
          <p class="font-medium mt-1">{{ (company.stats as any)?.conversation_count_this_month || 0 }}</p>
        </div>
      </div>
    </UCard>
  </div>
</template>
