<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const toast = useToast()
const { can } = usePermissions()

const { data: companyData, refresh } = await useFetch('/api/admin/company')

const form = reactive({
  name: '',
  slug: '',
  logo_url: ''
})
const saving = ref(false)

// Populate form when data loads
watch(companyData, (data) => {
  if (!data) return
  const company = data as Record<string, unknown>
  form.name = (company.name as string) || ''
  form.slug = (company.slug as string) || ''
  form.logo_url = (company.logo_url as string) || ''
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

const company = computed(() => companyData.value as Record<string, unknown> | null)
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

    <!-- Save Button -->
    <div v-if="can('company.update')" class="flex justify-end">
      <UButton
        size="lg"
        :loading="saving"
        icon="i-lucide-save"
        @click="saveSettings"
      >
        Salvar Configurações
      </UButton>
    </div>
  </div>
</template>
