<script setup lang="ts">
const emit = defineEmits<{
  connected: [account: { id: string; display_phone_number: string; verified_name: string | null; waba_id: string }]
}>()

const toast = useToast()
const config = useRuntimeConfig()

const connecting = ref(false)
const sdkReady = ref(false)

let connectTimeout: ReturnType<typeof setTimeout> | null = null

function clearTimers() {
  if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null }
}

function setConnecting(value: boolean) {
  connecting.value = value
  if (!value) { clearTimers(); return }
  connectTimeout = setTimeout(() => {
    connecting.value = false
    toast.add({ title: 'Tempo esgotado. Tente novamente.', color: 'warning' })
  }, 5 * 60_000)
}

// ── Pre-load FB SDK on mount ──────────────────────────────────────────────────

onMounted(() => {
  const appId = config.public.metaAppId as string
  if (!appId) {
    console.error('[Meta] NUXT_PUBLIC_META_APP_ID não está definido')
    return
  }

  console.log('[Meta] Carregando FB SDK para appId:', appId)

  if (window.FB) {
    console.log('[Meta] FB SDK já estava carregado')
    sdkReady.value = true
    return
  }

  // Define fbAsyncInit before loading the script (FB SDK requirement)
  window.fbAsyncInit = () => {
    console.log('[Meta] fbAsyncInit chamado — inicializando FB.init()')
    window.FB.init({
      appId,
      autoLogAppEvents: true,
      xfbml: true,
      version: 'v25.0'
    })
    console.log('[Meta] FB.init() concluído — SDK pronto')
    sdkReady.value = true
  }

  const script = document.createElement('script')
  script.id = 'facebook-jssdk'
  script.src = 'https://connect.facebook.net/en_US/sdk.js'
  script.async = true
  script.defer = true
  script.onerror = () => console.error('[Meta] Falha ao carregar o script do SDK do Facebook')
  document.body.appendChild(script)
  console.log('[Meta] Script do SDK adicionado ao DOM')
})

onUnmounted(() => {
  clearTimers()
})

// ── Connect — called directly from click (no await before FB.login) ───────────

function startEmbeddedSignup() {
  if (connecting.value) return

  const configId = config.public.metaEmbeddedSignupConfigId as string

  if (!sdkReady.value || !window.FB) {
    toast.add({ title: 'SDK do Facebook ainda carregando. Aguarde e tente novamente.', color: 'warning' })
    return
  }

  if (!configId) {
    toast.add({ title: 'Configuração Meta incompleta. Contate o suporte.', color: 'error' })
    return
  }

  setConnecting(true)

  console.log('[Meta] Chamando FB.login() com config_id:', configId)

  // FB.login MUST be called synchronously inside a user gesture handler
  window.FB.login(async (response: { authResponse?: { code?: string } }) => {
    console.log('[Meta] FB.login callback recebido:', JSON.stringify(response))
    if (!response.authResponse?.code) {
      setConnecting(false)
      toast.add({ title: 'Login cancelado ou não autorizado.', color: 'warning' })
      return
    }

    try {
      const account = await $fetch<{
        id: string
        display_phone_number: string
        verified_name: string | null
        waba_id: string
      }>('/api/admin/meta/accounts', {
        method: 'POST',
        body: { code: response.authResponse.code }
      })

      setConnecting(false)
      toast.add({ title: `WhatsApp conectado: ${account.display_phone_number}`, color: 'success' })
      emit('connected', account)
    } catch (err: unknown) {
      setConnecting(false)
      const msg = err instanceof Error ? err.message : 'Falha ao conectar conta WhatsApp'
      toast.add({ title: msg, color: 'error' })
    }
  }, {
    config_id: configId,
    response_type: 'code',
    override_default_response_type: true,
    extras: { setup: {} }
  })
}
</script>

<template>
  <div class="space-y-4 py-2">
    <p class="text-sm text-(--ui-text-muted) text-center max-w-sm mx-auto">
      Conecte sua conta do WhatsApp Business diretamente pelo fluxo oficial do Facebook.
    </p>

    <!-- Waiting for authorization -->
    <UAlert
      v-if="connecting"
      icon="i-lucide-info"
      color="info"
      variant="soft"
      title="Aguardando autorização..."
      description="Conclua o processo na janela popup do Facebook que foi aberta."
    />

    <!-- Pre-connection requirements -->
    <UAlert
      v-if="!connecting"
      icon="i-lucide-shield-check"
      color="neutral"
      variant="soft"
    >
      <template #description>
        <ul class="text-xs space-y-1 mt-1 list-disc list-inside">
          <li>O site deve estar acessível via <strong>HTTPS</strong></li>
          <li>O domínio deve estar na lista de <strong>Domínios Permitidos</strong> do app Meta</li>
          <li>Permita <strong>popups</strong> para este site no browser</li>
        </ul>
      </template>
    </UAlert>

    <div class="flex justify-center">
      <UButton
        :loading="connecting"
        :disabled="!sdkReady"
        color="success"
        icon="i-heroicons-link"
        @click="startEmbeddedSignup"
      >
        {{ connecting ? 'Aguardando...' : !sdkReady ? 'Carregando SDK...' : 'Conectar via Facebook' }}
      </UButton>
    </div>
  </div>
</template>
