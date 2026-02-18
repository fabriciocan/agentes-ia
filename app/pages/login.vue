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
    errorMsg.value = 'Invalid email or password'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Left Panel - Branding -->
    <div class="hidden lg:flex lg:w-1/2 bg-(--ui-primary) relative overflow-hidden items-center justify-center">
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div class="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white rounded-full translate-x-1/3 translate-y-1/3" />
        <div class="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div class="relative z-10 text-center text-white px-12 max-w-lg">
        <div class="flex justify-center mb-8">
          <div class="p-4 bg-white/20 backdrop-blur rounded-2xl">
            <UIcon
              name="i-lucide-bot"
              class="text-5xl text-white"
            />
          </div>
        </div>
        <h2 class="text-3xl font-bold mb-4">
          AI Agents Platform
        </h2>
        <p class="text-lg text-white/80">
          Multi-tenant AI agent platform for conversational customer service. Manage agents, knowledge bases and integrations.
        </p>

        <!-- Feature highlights -->
        <div class="mt-10 space-y-4 text-left">
          <div class="flex items-center gap-3 text-white/90">
            <div class="p-2 bg-white/20 rounded-lg shrink-0">
              <UIcon
                name="i-lucide-message-square"
                class="text-lg"
              />
            </div>
            <span class="text-sm">Multi-channel conversational AI</span>
          </div>
          <div class="flex items-center gap-3 text-white/90">
            <div class="p-2 bg-white/20 rounded-lg shrink-0">
              <UIcon
                name="i-lucide-book-open"
                class="text-lg"
              />
            </div>
            <span class="text-sm">RAG-powered knowledge base</span>
          </div>
          <div class="flex items-center gap-3 text-white/90">
            <div class="p-2 bg-white/20 rounded-lg shrink-0">
              <UIcon
                name="i-lucide-smartphone"
                class="text-lg"
              />
            </div>
            <span class="text-sm">WhatsApp &amp; Web Widget integration</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel - Login Form -->
    <div class="flex-1 flex items-center justify-center bg-(--ui-bg) px-4 sm:px-8">
      <div class="w-full max-w-sm">
        <!-- Mobile Logo -->
        <div class="lg:hidden flex justify-center mb-8">
          <div class="p-3 bg-(--ui-bg-accented) rounded-xl">
            <UIcon
              name="i-lucide-bot"
              class="text-4xl text-(--ui-primary)"
            />
          </div>
        </div>

        <!-- Header -->
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold text-(--ui-text-highlighted)">
            Welcome back
          </h1>
          <p class="text-sm text-(--ui-text-muted) mt-2">
            Sign in to your admin dashboard
          </p>
        </div>

        <!-- Form -->
        <div class="space-y-5">
          <UFormField
            label="Email"
            name="email"
          >
            <UInput
              v-model="email"
              type="email"
              placeholder="admin@company.com"
              icon="i-lucide-mail"
              size="lg"
              class="w-full"
              @keydown.enter="onSubmit"
            />
          </UFormField>

          <UFormField
            label="Password"
            name="password"
          >
            <UInput
              v-model="password"
              type="password"
              placeholder="Enter your password"
              icon="i-lucide-lock"
              size="lg"
              class="w-full"
              @keydown.enter="onSubmit"
            />
          </UFormField>

          <!-- Error message -->
          <div
            v-if="errorMsg"
            class="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
          >
            <UIcon
              name="i-lucide-alert-circle"
              class="text-lg shrink-0"
            />
            <span class="text-sm">{{ errorMsg }}</span>
          </div>

          <UButton
            block
            size="lg"
            :loading="loading"
            @click="onSubmit"
          >
            Sign In
          </UButton>
        </div>

        <!-- Footer -->
        <p class="text-center text-xs text-(--ui-text-dimmed) mt-8">
          AI Agents Platform &middot; Secure Admin Access
        </p>
      </div>
    </div>
  </div>
</template>
