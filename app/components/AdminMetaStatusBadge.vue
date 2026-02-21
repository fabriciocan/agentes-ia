<script setup lang="ts">
const props = defineProps<{
  agentId: string
}>()

interface MetaStatus {
  status: 'disconnected' | 'connected' | 'error' | 'loading'
  phone_number_id: string | null
  display_phone_number: string | null
  verified_name: string | null
  waba_id: string | null
  error?: string
}

const status = ref<MetaStatus | null>(null)
const loading = ref(true)

onMounted(fetchStatus)
watch(() => props.agentId, fetchStatus)

async function fetchStatus() {
  loading.value = true
  try {
    status.value = await $fetch<MetaStatus>(`/api/admin/agents/${props.agentId}/meta/status`)
  } catch {
    status.value = { status: 'disconnected', phone_number_id: null, display_phone_number: null, verified_name: null, waba_id: null }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-2 text-sm text-(--ui-text-muted)">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
      <span>Verificando conexão...</span>
    </div>

    <!-- Conectado -->
    <div v-else-if="status?.status === 'connected'" class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-2.5 h-2.5 rounded-full bg-green-500" />
        <div>
          <div class="text-sm font-medium">{{ status.verified_name }}</div>
          <div class="text-xs text-(--ui-text-muted) font-mono">{{ status.display_phone_number }}</div>
        </div>
      </div>
      <UBadge color="success" variant="subtle" size="sm">Conectado</UBadge>
    </div>

    <!-- Erro -->
    <div v-else-if="status?.status === 'error'" class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
        <UIcon name="i-lucide-alert-triangle" />
        <span>Token expirado ou número inválido</span>
      </div>
      <NuxtLink to="/admin/whatsapp">
        <UButton size="xs" color="error" variant="soft">Corrigir</UButton>
      </NuxtLink>
    </div>

    <!-- Desconectado -->
    <div v-else class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm text-(--ui-text-muted)">
        <div class="w-2.5 h-2.5 rounded-full bg-(--ui-text-dimmed)" />
        <span>Nenhum número oficial vinculado</span>
      </div>
      <NuxtLink to="/admin/whatsapp">
        <UButton size="xs" variant="soft" icon="i-lucide-link">
          Vincular
        </UButton>
      </NuxtLink>
    </div>
  </div>
</template>
