import { createHmac, timingSafeEqual } from 'node:crypto'
import { createLogger } from '../../utils/logger'

const logger = createLogger('webhook-n8n')

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const signature = getHeader(event, 'x-webhook-signature')

  if (!signature || !config.n8nWebhookSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid webhook signature' })
  }

  const rawBody = await readRawBody(event)
  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Empty body' })
  }

  const expectedSignature = createHmac('sha256', config.n8nWebhookSecret)
    .update(rawBody)
    .digest('hex')

  const sigBuffer = Buffer.from(signature, 'hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    logger.warn('Invalid webhook signature received')
    throw createError({ statusCode: 401, statusMessage: 'Invalid webhook signature' })
  }

  const body = JSON.parse(rawBody)

  logger.info({ action: body.action }, 'Webhook received from n8n')

  // Route to action handler
  switch (body.action) {
    case 'close_conversation':
      // Handle conversation close
      break
    case 'send_notification':
      // Handle notification
      break
    default:
      logger.warn({ action: body.action }, 'Unknown webhook action')
  }

  return { ok: true }
})
