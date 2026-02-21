<script setup lang="ts">
definePageMeta({ layout: false })

// ── State ────────────────────────────────────────────────────────────────────

type ProcessingState = 'loading' | 'success' | 'error' | 'no-opener'

const status = ref<ProcessingState>('loading')
const errorMessage = ref('')

// ── Helpers ──────────────────────────────────────────────────────────────────

function sendToOpener(message: Record<string, unknown>) {
  window.opener?.postMessage(message, window.location.origin)
}

function closeWithMessage(message: Record<string, unknown>, finalStatus: ProcessingState, delay = 1200) {
  status.value = finalStatus
  sendToOpener(message)
  setTimeout(() => window.close(), delay)
}

// ── Main flow — runs on mount (client-only, SSR is disabled globally) ────────

onMounted(async () => {
  // Guard: page opened directly, not as a popup
  if (!window.opener) {
    status.value = 'no-opener'
    return
  }

  const route = useRoute()
  const { code, error, state, response: rawResponse } = route.query as Record<string, string | undefined>

  // Meta returned an error or user cancelled
  if (error || !code) {
    closeWithMessage(
      { type: 'META_ERROR', message: 'Login cancelado ou negado pelo Facebook.' },
      'error'
    )
    return
  }

  // Parse the optional `response` param from Meta Embedded Signup
  // Format: {"type":"WA_EMBEDDED_SIGNUP","event":"FINISH","data":{"phone_number_id":"...","waba_id":"..."}}
  let wabaId: string | undefined
  let phoneNumberId: string | undefined
  if (rawResponse) {
    try {
      const parsed = JSON.parse(rawResponse) as {
        data?: { waba_id?: string; phone_number_id?: string }
      }
      wabaId = parsed.data?.waba_id
      phoneNumberId = parsed.data?.phone_number_id
    } catch { /* ignore parse errors */ }
  }

  // Exchange code for token via our server
  try {
    const redirectUri = window.location.origin + '/admin/meta/callback'

    const res = await $fetch<{
      id: string
      display_phone_number: string
      verified_name: string | null
      waba_id: string
    }>('/api/admin/meta/accounts', {
      method: 'POST',
      body: { code, redirect_uri: redirectUri, state, waba_id: wabaId, phone_number_id: phoneNumberId }
    })

    closeWithMessage(
      { type: 'META_CONNECTED', account: res },
      'success'
    )
  } catch (err: unknown) {
    const msg = err instanceof Error
      ? err.message
      : 'Falha ao conectar conta WhatsApp. Tente novamente.'

    closeWithMessage(
      { type: 'META_ERROR', message: msg },
      'error'
    )
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-(--ui-bg) text-(--ui-text)">

    <!-- Loading -->
    <template v-if="status === 'loading'">
      <UIcon name="i-lucide-loader-circle" class="size-10 text-(--ui-primary) animate-spin mb-4" />
      <p class="text-sm text-(--ui-text-muted)">Conectando sua conta WhatsApp&hellip;</p>
    </template>

    <!-- Success -->
    <template v-else-if="status === 'success'">
      <UIcon name="i-lucide-circle-check" class="size-10 text-green-500 mb-4" />
      <p class="text-sm font-medium">Conta conectada com sucesso!</p>
      <p class="text-xs text-(--ui-text-muted) mt-1">Esta janela fechará automaticamente.</p>
    </template>

    <!-- Error -->
    <template v-else-if="status === 'error'">
      <UIcon name="i-lucide-circle-x" class="size-10 text-red-500 mb-4" />
      <p class="text-sm font-medium">Ocorreu um erro</p>
      <p v-if="errorMessage" class="text-xs text-(--ui-text-muted) mt-1 max-w-xs text-center">
        {{ errorMessage }}
      </p>
      <p class="text-xs text-(--ui-text-muted) mt-1">Esta janela fechará automaticamente.</p>
    </template>

    <!-- Opened directly without a parent window -->
    <template v-else-if="status === 'no-opener'">
      <UIcon name="i-lucide-triangle-alert" class="size-10 text-amber-500 mb-4" />
      <p class="text-sm font-medium">Página inválida</p>
      <p class="text-xs text-(--ui-text-muted) mt-1 max-w-xs text-center">
        Esta página deve ser aberta pelo fluxo de conexão do Facebook. Acesse o painel e use o botão "Conectar via Facebook".
      </p>
    </template>

  </div>
</template>
