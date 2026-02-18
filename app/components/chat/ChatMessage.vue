<script setup lang="ts">
defineProps<{
  role: 'user' | 'assistant'
  content: string
  createdAt?: Date
}>()
</script>

<template>
  <div
    class="flex gap-3"
    :class="role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[80%] rounded-2xl px-4 py-2.5"
      :class="role === 'user'
        ? 'bg-primary text-primary-foreground rounded-br-md'
        : 'bg-muted rounded-bl-md'"
    >
      <p class="text-sm whitespace-pre-wrap">
        {{ content }}
      </p>
      <p
        v-if="createdAt"
        class="text-[10px] mt-1 opacity-60"
      >
        {{ new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
      </p>
    </div>
  </div>
</template>
