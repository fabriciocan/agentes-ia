import { prisma } from '../../lib/prisma'
import { generateWidgetScript } from '../../utils/widget-template'
import type { AgentConfig, WidgetConfig } from '../../types'

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')
  if (!agentId) {
    throw createError({ statusCode: 400, statusMessage: 'Agent ID required' })
  }

  const agent = await prisma.agent_configs.findFirst({
    where: { id: agentId, is_active: true },
    select: { id: true, name: true, widget_config: true }
  }) as unknown as Pick<AgentConfig, 'id' | 'name' | 'widget_config'> | null

  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  const wc: WidgetConfig = typeof agent.widget_config === 'string'
    ? JSON.parse(agent.widget_config)
    : agent.widget_config || {}

  const { n8nWebhookUrl } = useRuntimeConfig()
  if (!n8nWebhookUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Server misconfigured' })
  }

  const script = generateWidgetScript({
    agentId: agent.id,
    agentName: agent.name,
    webhookUrl: n8nWebhookUrl,
    primaryColor: wc.primaryColor || '#0F172A',
    botName: wc.botName || agent.name,
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

  setResponseHeaders(event, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=300'
  })

  return script
})
