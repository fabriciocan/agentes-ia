<script setup lang="ts">
const props = defineProps<{
  agentId: string
}>()

const toast = useToast()

const status = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const qrCodeBase64 = ref<string | null>(null)
const phone = ref<string | null>(null)
const instanceName = ref<string | null>(null)
const loading = ref(false)
const polling = ref(false)
let pollInterval: ReturnType<typeof setInterval> | null = null

// Fetch current status on mount
onMounted(async () => {
  await fetchStatus()
})

onUnmounted(() => {
  stopPolling()
})

// Watch for agent change
watch(() => props.agentId, async () => {
  stopPolling()
  qrCodeBase64.value = null
  await fetchStatus()
})

async function fetchStatus() {
  try {
    const res = await $fetch<{ status: string; instance_name: string | null; phone: string | null }>(
      `/api/admin/agents/${props.agentId}/whatsapp/status`
    )
    status.value = res.status as typeof status.value
    instanceName.value = res.instance_name
    phone.value = res.phone

    if (res.status === 'connecting' && !pollInterval) {
      startPolling()
    } else if (res.status !== 'connecting') {
      stopPolling()
    }
  } catch {
    // Agent may not have WhatsApp configured yet
    status.value = 'disconnected'
  }
}

async function connectWhatsApp() {
  loading.value = true
  try {
    const res = await $fetch<{ instance_name: string; status: string; qrcode: string | null }>(
      `/api/admin/agents/${props.agentId}/whatsapp/connect`,
      { method: 'POST' }
    )
    status.value = 'connecting'
    instanceName.value = res.instance_name
    qrCodeBase64.value = res.qrcode
    startPolling()
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to connect'
    toast.add({ title: msg, color: 'error' })
  } finally {
    loading.value = false
  }
}

async function refreshQrCode() {
  try {
    const res = await $fetch<{ base64: string }>(
      `/api/admin/agents/${props.agentId}/whatsapp/qrcode`
    )
    qrCodeBase64.value = res.base64
  } catch {
    toast.add({ title: 'Failed to refresh QR code', color: 'error' })
  }
}

async function disconnectWhatsApp() {
  loading.value = true
  try {
    await $fetch(`/api/admin/agents/${props.agentId}/whatsapp/disconnect`, {
      method: 'POST'
    })
    status.value = 'disconnected'
    qrCodeBase64.value = null
    phone.value = null
    instanceName.value = null
    stopPolling()
    toast.add({ title: 'WhatsApp disconnected', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to disconnect', color: 'error' })
  } finally {
    loading.value = false
  }
}

function startPolling() {
  if (pollInterval) return
  polling.value = true
  pollInterval = setInterval(async () => {
    await fetchStatus()
    if (status.value === 'connected') {
      stopPolling()
      toast.add({ title: 'WhatsApp connected!', color: 'success' })
    }
  }, 5000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  polling.value = false
}
</script>

<template>
  <div class="space-y-4">
    <!-- Disconnected State -->
    <div v-if="status === 'disconnected'" class="text-center py-6">
      <div class="text-muted mb-4">
        No WhatsApp connected to this agent.
      </div>
      <UButton
        icon="i-heroicons-phone"
        :loading="loading"
        @click="connectWhatsApp"
      >
        Connect WhatsApp
      </UButton>
    </div>

    <!-- Connecting State (QR Code) -->
    <div v-else-if="status === 'connecting'" class="text-center space-y-4">
      <div class="text-sm text-muted">
        Scan the QR code with WhatsApp to connect
      </div>

      <div v-if="qrCodeBase64" class="flex justify-center">
        <img
          :src="qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`"
          alt="WhatsApp QR Code"
          class="w-64 h-64 rounded-lg border"
        >
      </div>
      <div v-else class="flex justify-center py-8">
        <UButton
          variant="outline"
          icon="i-heroicons-qr-code"
          @click="refreshQrCode"
        >
          Load QR Code
        </UButton>
      </div>

      <div class="flex justify-center gap-2">
        <UButton
          variant="outline"
          size="sm"
          icon="i-heroicons-arrow-path"
          @click="refreshQrCode"
        >
          Refresh QR
        </UButton>
        <UButton
          variant="outline"
          color="error"
          size="sm"
          :loading="loading"
          @click="disconnectWhatsApp"
        >
          Cancel
        </UButton>
      </div>

      <div v-if="polling" class="text-xs text-muted animate-pulse">
        Waiting for connection...
      </div>
    </div>

    <!-- Connected State -->
    <div v-else-if="status === 'connected'" class="space-y-4">
      <div class="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
        <div class="w-3 h-3 rounded-full bg-green-500" />
        <div class="flex-1">
          <div class="font-medium text-green-800 dark:text-green-200">
            WhatsApp Connected
          </div>
          <div v-if="phone" class="text-sm text-green-600 dark:text-green-400">
            {{ phone }}
          </div>
          <div v-if="instanceName" class="text-xs text-muted">
            Instance: {{ instanceName }}
          </div>
        </div>
      </div>

      <UButton
        variant="outline"
        color="error"
        size="sm"
        :loading="loading"
        @click="disconnectWhatsApp"
      >
        Disconnect WhatsApp
      </UButton>
    </div>
  </div>
</template>
