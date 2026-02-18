<script setup lang="ts">
definePageMeta({
  layout: false
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
    <div class="text-center space-y-6">
      <h1 class="text-4xl font-bold">
        AI Agents Platform
      </h1>
      <p class="text-lg max-w-md text-gray-500">
        Multi-tenant AI agent platform for conversational customer service.
      </p>
      <div class="flex gap-3 justify-center">
        <UButton
          to="/login"
          size="lg"
        >
          Admin Login
        </UButton>
      </div>
    </div>
  </div>
</template>
