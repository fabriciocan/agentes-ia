import { prisma } from '../../lib/prisma'
import { verifyWebhookSignature, sendTextMessage, markMessageRead } from '../../services/whatsapp-cloud.service'
import { processWhatsAppMessage } from '../../services/ai-processor.service'
import { createLogger } from '../../utils/logger'

const logger = createLogger('webhook-whatsapp-cloud')

// Estrutura do payload do Meta Cloud API
interface MetaWebhookPayload {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: { name: string }
          wa_id: string
        }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          type: string
          text?: { body: string }
          image?: { id: string; mime_type: string; caption?: string }
          audio?: { id: string; mime_type: string }
          video?: { id: string; mime_type: string; caption?: string }
          document?: { id: string; filename?: string; mime_type: string }
          sticker?: { id: string }
          location?: { latitude: number; longitude: number; name?: string; address?: string }
          reaction?: { message_id: string; emoji: string }
          interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } }
        }>
        statuses?: Array<{
          id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
          recipient_id: string
        }>
      }
      field: string
    }>
  }>
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Lê o body como texto para verificar assinatura
  const rawBody = await readRawBody(event) ?? ''
  const signature = getHeader(event, 'x-hub-signature-256') ?? null

  // Verifica assinatura apenas se o app secret estiver configurado
  if (config.metaAppSecret) {
    const isValid = verifyWebhookSignature(rawBody, signature, config.metaAppSecret)
    if (!isValid) {
      logger.warn({ signature }, 'Invalid webhook signature from Meta')
      throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })
    }
  }

  let payload: MetaWebhookPayload
  try {
    payload = JSON.parse(rawBody) as MetaWebhookPayload
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON body' })
  }

  // Meta exige resposta 200 rápida. Processamos de forma síncrona mas o retorno é imediato.
  // Para mensagens que demoram > 5s, considere mover para queue.
  if (payload.object !== 'whatsapp_business_account') {
    return { status: 'ignored' }
  }

  // Processa cada entry em paralelo
  const processingPromises = payload.entry?.flatMap(entry =>
    entry.changes?.flatMap(change => {
      const value = change.value
      if (change.field !== 'messages') return []

      const phoneNumberId = value.metadata?.phone_number_id
      if (!phoneNumberId) return []

      // Ignora status updates (delivered, read, etc.)
      if (!value.messages?.length) return []

      return value.messages.map(msg =>
        handleIncomingMessage(phoneNumberId, msg, value.contacts ?? [])
          .catch(err => logger.error({ err, messageId: msg.id, phoneNumberId }, 'Error processing message'))
      )
    }) ?? []
  ) ?? []

  // Retorna 200 imediatamente — Meta exige resposta em < 5s e reenvia caso contrário.
  // O processamento continua em background sem bloquear a resposta.
  Promise.allSettled(processingPromises).catch(err =>
    logger.error({ err }, 'Unhandled error in webhook processing')
  )

  return { status: 'ok' }
})

async function handleIncomingMessage(
  phoneNumberId: string,
  msg: NonNullable<MetaWebhookPayload['entry'][0]['changes'][0]['value']['messages']>[0],
  contacts: NonNullable<MetaWebhookPayload['entry'][0]['changes'][0]['value']['contacts']>
) {
  // Só processa mensagens de texto por enquanto
  if (msg.type !== 'text' || !msg.text?.body) {
    logger.info({ type: msg.type, messageId: msg.id }, 'Non-text message received, skipping')
    return
  }

  const fromPhone = msg.from
  const messageText = msg.text.body
  const senderName = contacts.find(c => c.wa_id === fromPhone)?.profile?.name

  logger.info({ phoneNumberId, fromPhone, messageId: msg.id }, 'Incoming WhatsApp Cloud message')

  // Busca agent configurado com este phone_number_id
  const agent = await prisma.agent_configs.findFirst({
    where: {
      meta_phone_number_id: phoneNumberId,
      whatsapp_provider: 'meta',
      is_active: true
    },
    select: {
      id: true,
      client_id: true,
      name: true,
      system_prompt: true,
      personality: true,
      tone: true,
      language: true,
      model: true,
      temperature: true,
      max_tokens: true,
      meta_access_token: true
    }
  })

  if (!agent) {
    logger.warn({ phoneNumberId }, 'No active agent found for this phone_number_id')
    return
  }

  if (!agent.meta_access_token) {
    logger.error({ agentId: agent.id }, 'Agent has no meta_access_token, cannot send reply')
    return
  }

  // Marca mensagem como lida
  await markMessageRead(phoneNumberId, agent.meta_access_token, msg.id)

  // Processa com IA e obtém resposta
  const replyText = await processWhatsAppMessage(
    {
      id: agent.id,
      client_id: agent.client_id,
      name: agent.name,
      system_prompt: agent.system_prompt,
      personality: agent.personality,
      tone: agent.tone,
      language: agent.language,
      model: agent.model,
      temperature: agent.temperature as unknown as number,
      max_tokens: agent.max_tokens
    },
    fromPhone,
    messageText
  )

  // Envia resposta via Meta Graph API
  if (replyText) {
    await sendTextMessage(phoneNumberId, agent.meta_access_token, fromPhone, replyText)
    logger.info({ agentId: agent.id, fromPhone, senderName }, 'Reply sent via Meta Cloud API')
  }
}
