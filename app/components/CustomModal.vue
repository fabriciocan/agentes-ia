<script setup lang="ts">
defineProps<{
  modelValue: boolean
  title?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[9999] overflow-y-auto"
        @click.self="close"
      >
        <!-- Overlay -->
        <div class="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/75" />

        <!-- Modal Container -->
        <div class="flex min-h-full items-center justify-center p-4">
          <div
            class="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-xl"
            @click.stop
          >
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
