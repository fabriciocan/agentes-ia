<script setup lang="ts">
const emit = defineEmits<{
  send: [message: string]
}>()

defineProps<{
  disabled?: boolean
}>()

const message = ref('')

function handleSend() {
  const trimmed = message.value.trim()
  if (!trimmed) return
  emit('send', trimmed)
  message.value = ''
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="flex gap-2 items-end">
    <UTextarea
      v-model="message"
      :disabled="disabled"
      placeholder="Type a message..."
      autoresize
      :rows="1"
      :maxrows="4"
      class="flex-1"
      @keydown="handleKeydown"
    />
    <UButton
      icon="i-lucide-send"
      :disabled="disabled || !message.trim()"
      @click="handleSend"
    />
  </div>
</template>
