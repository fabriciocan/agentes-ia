<script setup lang="ts">
definePageMeta({
  layout: false
})

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function onSubmit() {
  if (!email.value || !password.value) return
  loading.value = true
  errorMsg.value = ''

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })
    await navigateTo('/admin')
  } catch {
    errorMsg.value = 'E-mail ou senha inválidos'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex bg-gray-950">
    <!-- Left Panel - Branding -->
    <div class="hidden lg:flex lg:w-[55%] relative overflow-hidden items-center justify-center">
      <!-- Dark gradient background -->
      <div class="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black" />

      <!-- Subtle grid pattern -->
      <div
        class="absolute inset-0 opacity-[0.03]"
        style="background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px); background-size: 40px 40px;"
      />

      <!-- Green glow orbs -->
      <div class="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-primary-500/10 blur-[120px] pointer-events-none" />
      <div class="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-primary-400/8 blur-[100px] pointer-events-none" />

      <!-- Content -->
      <div class="relative z-10 px-16 max-w-xl">
        <!-- Logo -->
        <div class="flex items-center gap-3 mb-16">
          <div class="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <UIcon
              name="i-lucide-bot"
              class="text-xl text-white"
            />
          </div>
          <span class="text-white font-semibold text-lg tracking-tight">AgentesIA</span>
        </div>

        <!-- Headline -->
        <h1 class="text-4xl font-bold text-white leading-tight mb-6">
          Atendimento inteligente,<br>
          <span class="text-primary-400">resultados reais</span>
        </h1>
        <p class="text-gray-400 text-lg leading-relaxed mb-14">
          Plataforma de agentes de IA para WhatsApp que atende 24/7, qualifica leads e escala sua operação.
        </p>

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-6 mb-14">
          <div>
            <div class="text-2xl font-bold text-white mb-1">
              24/7
            </div>
            <div class="text-xs text-gray-500 uppercase tracking-wider">
              Disponibilidade
            </div>
          </div>
          <div>
            <div class="text-2xl font-bold text-white mb-1">
              -70%
            </div>
            <div class="text-xs text-gray-500 uppercase tracking-wider">
              Custo operacional
            </div>
          </div>
          <div>
            <div class="text-2xl font-bold text-white mb-1">
              +40%
            </div>
            <div class="text-xs text-gray-500 uppercase tracking-wider">
              Conversão
            </div>
          </div>
        </div>

        <!-- Features -->
        <div class="space-y-3">
          <div
            v-for="feature in [
              { icon: 'i-simple-icons-whatsapp', label: 'Integração nativa com WhatsApp Cloud API' },
              { icon: 'i-lucide-brain', label: 'Base de conhecimento com RAG + Qdrant' },
              { icon: 'i-lucide-building-2', label: 'Multi-empresa e multi-agente' }
            ]"
            :key="feature.label"
            class="flex items-center gap-3"
          >
            <div class="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
              <UIcon
                :name="feature.icon"
                class="text-sm text-primary-400"
              />
            </div>
            <span class="text-sm text-gray-400">{{ feature.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel - Login Form -->
    <div class="flex-1 flex items-center justify-center px-6 sm:px-12 relative">
      <!-- Subtle border separator -->
      <div class="absolute left-0 top-12 bottom-12 w-px bg-gradient-to-b from-transparent via-gray-800 to-transparent hidden lg:block" />

      <div class="w-full max-w-sm">
        <!-- Mobile logo -->
        <div class="lg:hidden flex items-center gap-2 justify-center mb-10">
          <div class="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <UIcon
              name="i-lucide-bot"
              class="text-white text-base"
            />
          </div>
          <span class="text-white font-semibold">AgentesIA</span>
        </div>

        <!-- Header -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-white mb-1">
            Bem-vindo de volta
          </h2>
          <p class="text-gray-500 text-sm">
            Entre na sua conta para acessar o painel
          </p>
        </div>

        <!-- Form -->
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">E-mail</label>
            <input
              v-model="email"
              type="email"
              placeholder="seu@email.com"
              class="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder-gray-600 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all"
              @keydown.enter="onSubmit"
            >
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Senha</label>
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder-gray-600 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all"
              @keydown.enter="onSubmit"
            >
          </div>

          <!-- Error -->
          <div
            v-if="errorMsg"
            class="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400"
          >
            <UIcon
              name="i-lucide-alert-circle"
              class="shrink-0 text-base"
            />
            <span class="text-sm">{{ errorMsg }}</span>
          </div>

          <!-- Submit -->
          <button
            :disabled="loading"
            class="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-semibold text-sm transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
            @click="onSubmit"
          >
            <svg
              v-if="loading"
              class="animate-spin w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {{ loading ? 'Entrando...' : 'Entrar' }}
          </button>
        </div>

        <!-- Footer -->
        <p class="text-center text-xs text-gray-700 mt-10">
          AgentesIA · Acesso restrito a administradores
        </p>
      </div>
    </div>
  </div>
</template>
