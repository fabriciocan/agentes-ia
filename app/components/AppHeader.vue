<script setup lang="ts">
const route = useRoute()

const items = computed(() => [{
  label: 'Pricing',
  to: '/pricing'
}, {
  label: 'Blog',
  to: '/blog'
}, {
  label: 'Changelog',
  to: '/changelog'
}])
</script>

<template>
  <UHeader>
    <template #left>
      <NuxtLink
        to="/"
        class="flex items-center gap-2 font-bold text-lg text-highlighted"
      >
        <UIcon
          name="i-lucide-bot"
          class="w-6 h-6 text-primary"
        />
        AgentesIA
      </NuxtLink>
    </template>

    <UNavigationMenu
      :items="items"
      variant="link"
    />

    <template #right>
      <UColorModeButton />

      <UButton
        icon="i-lucide-log-in"
        color="neutral"
        variant="ghost"
        to="/login"
        class="lg:hidden"
      />

      <UButton
        label="Entrar"
        color="neutral"
        variant="outline"
        to="/login"
        class="hidden lg:inline-flex"
      />

      <UButton
        label="Ver planos"
        color="primary"
        trailing-icon="i-lucide-arrow-right"
        class="hidden lg:inline-flex"
        to="/pricing"
      />
    </template>

    <template #body>
      <UNavigationMenu
        :items="items"
        orientation="vertical"
        class="-mx-2.5"
      />

      <USeparator class="my-6" />

      <UButton
        label="Entrar"
        color="neutral"
        variant="subtle"
        to="/login"
        block
        class="mb-3"
      />
      <UButton
        label="Ver planos"
        color="primary"
        to="/pricing"
        block
      />
    </template>
  </UHeader>
</template>
