<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const emit = defineEmits<{
  save: [data: Record<string, unknown>]
}>()

const { can } = usePermissions()

const props = defineProps<{
  initialData?: Record<string, unknown>
  loading?: boolean
}>()

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  system_prompt: z.string().max(10000)
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  name: (props.initialData?.name as string) || 'Default Agent',
  system_prompt: (props.initialData?.system_prompt as string) || ''
})

// Watch for prop changes and update state
watch(() => props.initialData, (newData) => {
  if (newData) {
    state.name = (newData.name as string) || 'Default Agent'
    state.system_prompt = (newData.system_prompt as string) || ''
  }
}, { immediate: true })

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit('save', event.data)
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-5"
    @submit="onSubmit"
  >
    <UFormField
      label="Agent Name"
      name="name"
    >
      <UInput
        v-model="state.name"
        class="w-full"
        size="lg"
      />
    </UFormField>

    <UFormField
      label="System Prompt"
      name="system_prompt"
      description="This prompt will be used by your n8n workflow to define the agent's behavior"
    >
      <UTextarea
        v-model="state.system_prompt"
        :rows="12"
        class="w-full"
        placeholder="You are a helpful customer support assistant. Your goal is to..."
      />
    </UFormField>

    <div class="flex justify-end pt-2">
      <UButton
        v-if="can('agents.update')"
        type="submit"
        :loading="loading"
        icon="i-lucide-save"
      >
        Save Configuration
      </UButton>
      <p v-else class="text-sm text-(--ui-text-muted) italic">
        Somente leitura
      </p>
    </div>
  </UForm>
</template>
