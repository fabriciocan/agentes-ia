<script setup lang="ts">
const columns = [{
  label: 'Produto',
  children: [{
    label: 'Funcionalidades',
    to: '/#features'
  }, {
    label: 'Preços',
    to: '/pricing'
  }, {
    label: 'Changelog',
    to: '/changelog'
  }, {
    label: 'Blog',
    to: '/blog'
  }]
}, {
  label: 'Recursos',
  children: [{
    label: 'Documentação',
    to: '/blog'
  }, {
    label: 'Casos de Uso',
    to: '/blog'
  }, {
    label: 'Integrações',
    to: '/pricing'
  }]
}, {
  label: 'Empresa',
  children: [{
    label: 'Sobre Nós',
    to: '/blog'
  }, {
    label: 'Contato',
    to: '/pricing'
  }, {
    label: 'Parceiros',
    to: '/pricing'
  }]
}]

const toast = useToast()
const email = ref('')

function onSubmit() {
  toast.add({
    title: 'Inscrito!',
    description: 'Você receberá nossas novidades em breve.'
  })
  email.value = ''
}
</script>

<template>
  <USeparator
    icon="i-lucide-bot"
    class="h-px"
  />

  <UFooter :ui="{ top: 'border-b border-default' }">
    <template #top>
      <UContainer>
        <UFooterColumns :columns="columns">
          <template #right>
            <form @submit.prevent="onSubmit">
              <UFormField
                name="email"
                label="Receba nossas novidades"
                size="lg"
              >
                <UInput
                  v-model="email"
                  type="email"
                  class="w-full"
                  placeholder="seu@email.com"
                >
                  <template #trailing>
                    <UButton
                      type="submit"
                      size="xs"
                      color="primary"
                      label="Assinar"
                    />
                  </template>
                </UInput>
              </UFormField>
            </form>
          </template>
        </UFooterColumns>
      </UContainer>
    </template>

    <template #left>
      <p class="text-muted text-sm">
        AgentesIA · Plataforma de IA para WhatsApp · © {{ new Date().getFullYear() }}
      </p>
    </template>

    <template #right>
      <UButton
        to="https://wa.me/"
        target="_blank"
        icon="i-simple-icons-whatsapp"
        aria-label="WhatsApp"
        color="neutral"
        variant="ghost"
      />
      <UButton
        to="https://linkedin.com"
        target="_blank"
        icon="i-simple-icons-linkedin"
        aria-label="LinkedIn"
        color="neutral"
        variant="ghost"
      />
      <UButton
        to="https://instagram.com"
        target="_blank"
        icon="i-simple-icons-instagram"
        aria-label="Instagram"
        color="neutral"
        variant="ghost"
      />
    </template>
  </UFooter>
</template>
