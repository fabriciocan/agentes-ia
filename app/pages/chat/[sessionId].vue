<script setup lang="ts">
const route = useRoute()
const sessionId = route.params.sessionId as string

// These would come from query params or config in a real embed scenario
const agentConfigId = (route.query.agent as string) || ''
const apiKey = (route.query.key as string) || ''

definePageMeta({
  layout: false
})
</script>

<template>
  <div class="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
    <div class="w-full max-w-lg h-[600px]">
      <ChatWidget
        v-if="agentConfigId && apiKey"
        :agent-config-id="agentConfigId"
        :api-key="apiKey"
        :user-external-id="sessionId"
      />
      <div
        v-else
        class="flex items-center justify-center h-full text-muted"
      >
        <p>Missing agent configuration. Please provide ?agent=&key= params.</p>
      </div>
    </div>
  </div>
</template>
