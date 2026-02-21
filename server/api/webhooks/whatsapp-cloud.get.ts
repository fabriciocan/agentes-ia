/**
 * GET /api/webhooks/whatsapp-cloud
 *
 * Verificação de webhook exigida pelo Meta.
 * O Meta envia hub.mode, hub.verify_token e hub.challenge.
 * Se o verify_token bater, deve-se responder com hub.challenge como texto puro.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Usa getRequestURL para pegar os params sem decodificação automática problemática
  const url = getRequestURL(event)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge') ?? ''

  if (mode === 'subscribe' && token === config.metaWebhookVerifyToken) {
    // send() garante que o body é enviado como texto puro sem transformações do Nitro
    return send(event, challenge, 'text/plain')
  }

  throw createError({ statusCode: 403, statusMessage: 'Forbidden: invalid verify_token' })
})
