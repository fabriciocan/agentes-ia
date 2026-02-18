<script setup lang="ts">
import type { WidgetConfig } from '~~/server/types'

const props = defineProps<{
  agentId: string
  initialWidgetConfig?: WidgetConfig
}>()

const emit = defineEmits<{
  save: [data: { widget_config: WidgetConfig }]
}>()

const toast = useToast()
const { getWidgetScript } = useAgent()

const config = reactive<WidgetConfig>({
  primaryColor: '#0F172A',
  botName: '',
  welcomeMessage: 'Olá! Como posso ajudar?',
  inputPlaceholder: 'Digite sua mensagem...',
  headerOnlineText: 'Online',
  consentEnabled: false,
  consentTitle: 'Privacidade & Consentimento',
  consentDescription: 'Leia a política de privacidade antes de continuar.',
  consentText: '',
  consentCheckboxLabel: 'Concordo com os termos acima e desejo usar o chat.',
  consentButtonText: 'Aceitar & Iniciar Chat'
})

// Sync initial data
watch(() => props.initialWidgetConfig, (wc) => {
  if (wc) {
    Object.assign(config, {
      primaryColor: wc.primaryColor || '#0F172A',
      botName: wc.botName || '',
      welcomeMessage: wc.welcomeMessage || 'Olá! Como posso ajudar?',
      inputPlaceholder: wc.inputPlaceholder || 'Digite sua mensagem...',
      headerOnlineText: wc.headerOnlineText || 'Online',
      consentEnabled: wc.consentEnabled ?? false,
      consentTitle: wc.consentTitle || 'Privacidade & Consentimento',
      consentDescription: wc.consentDescription || 'Leia a política de privacidade antes de continuar.',
      consentText: wc.consentText || '',
      consentCheckboxLabel: wc.consentCheckboxLabel || 'Concordo com os termos acima e desejo usar o chat.',
      consentButtonText: wc.consentButtonText || 'Aceitar & Iniciar Chat'
    })
  }
}, { immediate: true })

const saving = ref(false)
const generatingCode = ref(false)
const embedCode = ref('')

async function saveWidgetConfig() {
  saving.value = true
  try {
    emit('save', { widget_config: { ...config } })
  } finally {
    saving.value = false
  }
}

async function generateCode() {
  generatingCode.value = true
  try {
    const result = await getWidgetScript(props.agentId)
    embedCode.value = result.embedCode
    toast.add({ title: 'Código gerado com sucesso!', color: 'success' })
  } catch {
    toast.add({ title: 'Erro ao gerar código. Salve a configuração primeiro.', color: 'error' })
  } finally {
    generatingCode.value = false
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(embedCode.value)
    toast.add({ title: 'Código copiado!', color: 'success' })
  } catch {
    toast.add({ title: 'Erro ao copiar', color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Appearance -->
    <div class="space-y-4">
      <h4 class="text-sm font-medium text-gray-500">
        Aparência
      </h4>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Cor Primária">
          <div class="flex items-center gap-3">
            <input
              v-model="config.primaryColor"
              type="color"
              class="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
            >
            <UInput
              v-model="config.primaryColor"
              placeholder="#0F172A"
              class="flex-1"
            />
          </div>
        </UFormField>

        <UFormField label="Nome do Bot">
          <UInput
            v-model="config.botName"
            placeholder="Assistente Virtual"
          />
        </UFormField>
      </div>

      <UFormField label="Mensagem de Boas-vindas">
        <UTextarea
          v-model="config.welcomeMessage"
          :rows="2"
          placeholder="Olá! Como posso ajudar?"
        />
      </UFormField>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Placeholder do Input">
          <UInput
            v-model="config.inputPlaceholder"
            placeholder="Digite sua mensagem..."
          />
        </UFormField>

        <UFormField label="Texto de Status">
          <UInput
            v-model="config.headerOnlineText"
            placeholder="Online"
          />
        </UFormField>
      </div>
    </div>

    <!-- Consent -->
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <h4 class="text-sm font-medium text-gray-500">
          Tela de Consentimento
        </h4>
        <UToggle v-model="config.consentEnabled" />
      </div>

      <template v-if="config.consentEnabled">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Título">
            <UInput v-model="config.consentTitle" />
          </UFormField>

          <UFormField label="Texto do Botão">
            <UInput v-model="config.consentButtonText" />
          </UFormField>
        </div>

        <UFormField label="Descrição">
          <UInput v-model="config.consentDescription" />
        </UFormField>

        <UFormField label="Texto do Consentimento (aceita HTML)">
          <UTextarea
            v-model="config.consentText"
            :rows="3"
            placeholder='Eu li e aceito a <a href="https://..." target="_blank">política de privacidade</a>.'
          />
        </UFormField>

        <UFormField label="Label do Checkbox">
          <UInput v-model="config.consentCheckboxLabel" />
        </UFormField>
      </template>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap gap-3">
      <UButton
        :loading="saving"
        @click="saveWidgetConfig"
      >
        Salvar Configuração
      </UButton>

      <UButton
        variant="outline"
        :loading="generatingCode"
        @click="generateCode"
      >
        Gerar Código
      </UButton>
    </div>

    <!-- Generated Code -->
    <div v-if="embedCode">
      <UFormField label="Código para Embed">
        <div class="relative">
          <pre class="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto max-h-64"><code>{{ embedCode }}</code></pre>
          <UButton
            variant="ghost"
            size="xs"
            icon="i-heroicons-clipboard-document"
            class="absolute top-2 right-2"
            @click="copyCode"
          >
            Copiar
          </UButton>
        </div>
      </UFormField>
      <p class="text-xs text-gray-500 mt-2">
        Cole este código antes do &lt;/body&gt; do seu site.
      </p>
    </div>
  </div>
</template>
