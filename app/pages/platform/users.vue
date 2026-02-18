<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

// Placeholder - endpoint ainda não criado
const users = ref([])
const loading = ref(false)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          All Users
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Manage users across all companies
        </p>
      </div>
    </div>

    <!-- Coming Soon -->
    <UCard>
      <div class="text-center py-12">
        <UIcon name="i-lucide-users" class="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Users Management
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          View and manage all users across the platform
        </p>
        <UBadge color="primary" variant="subtle" size="lg">
          Coming Soon
        </UBadge>
      </div>
    </UCard>
  </div>
</template>
