<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        Platform Settings
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mt-1">
        Configure global platform settings
      </p>
    </div>

    <!-- Settings Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- System Configuration -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-settings" class="w-5 h-5" />
            <h2 class="text-lg font-semibold">System Configuration</h2>
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Platform Name
            </label>
            <UInput placeholder="AI Agents Platform" disabled />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Support Email
            </label>
            <UInput placeholder="support@platform.com" disabled />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Language
            </label>
            <USelect
              :options="['English', 'Portuguese', 'Spanish']"
              disabled
            />
          </div>
        </div>
      </UCard>

      <!-- Security Settings -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shield" class="w-5 h-5" />
            <h2 class="text-lg font-semibold">Security Settings</h2>
          </div>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                2FA Required
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Require two-factor authentication for all users
              </p>
            </div>
            <UToggle disabled />
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                Password Expiry
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Force password change every 90 days
              </p>
            </div>
            <UToggle disabled />
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                Session Timeout
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Auto logout after 30 minutes of inactivity
              </p>
            </div>
            <UToggle disabled />
          </div>
        </div>
      </UCard>

      <!-- Billing & Subscriptions -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-credit-card" class="w-5 h-5" />
            <h2 class="text-lg font-semibold">Billing & Subscriptions</h2>
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Plan
            </label>
            <USelect
              :options="['Free', 'Starter', 'Professional', 'Enterprise']"
              disabled
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trial Period (days)
            </label>
            <UInput type="number" placeholder="14" disabled />
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                Auto-suspend on payment failure
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Automatically suspend accounts with failed payments
              </p>
            </div>
            <UToggle disabled />
          </div>
        </div>
      </UCard>

      <!-- Notifications -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-bell" class="w-5 h-5" />
            <h2 class="text-lg font-semibold">Notifications</h2>
          </div>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                Email Notifications
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Send email notifications for important events
              </p>
            </div>
            <UToggle disabled />
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                Slack Integration
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Send alerts to Slack channel
              </p>
            </div>
            <UToggle disabled />
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                Daily Summary
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Receive daily platform summary email
              </p>
            </div>
            <UToggle disabled />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Coming Soon Notice -->
    <UCard class="mt-6">
      <div class="text-center py-8">
        <UIcon name="i-lucide-construction" class="w-12 h-12 mx-auto mb-3 text-orange-500" />
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Settings Configuration
        </h3>
        <p class="text-gray-600 dark:text-gray-400">
          Platform settings are currently read-only. Configuration interface coming soon.
        </p>
        <UBadge color="warning" variant="subtle" size="lg" class="mt-4">
          In Development
        </UBadge>
      </div>
    </UCard>
  </div>
</template>
