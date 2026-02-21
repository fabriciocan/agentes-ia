import { createHmac, timingSafeEqual } from 'crypto'
import { createLogger } from '../utils/logger'

const logger = createLogger('whatsapp-cloud')

const GRAPH_API_VERSION = 'v25.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// ─── Envio de mensagens ────────────────────────────────────────────────────

export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<{ message_id: string }> {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text, preview_url: false }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    logger.error({ phoneNumberId, to, status: response.status, error }, 'Failed to send WhatsApp message')
    throw new Error(`Meta API error ${response.status}: ${error}`)
  }

  const data = await response.json() as { messages: Array<{ id: string }> }
  return { message_id: data.messages?.[0]?.id ?? '' }
}

export async function markMessageRead(
  phoneNumberId: string,
  accessToken: string,
  messageId: string
): Promise<void> {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId
    })
  }).catch(err => logger.warn({ err, messageId }, 'Failed to mark message as read'))
}

// ─── Segurança do webhook ──────────────────────────────────────────────────

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader) return false
  // Meta envia: sha256=<hex>
  const [algo, receivedSig] = signatureHeader.split('=')
  if (algo !== 'sha256' || !receivedSig) return false

  const expected = createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex')

  try {
    return timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expected, 'hex')
    )
  } catch {
    return false
  }
}

// ─── Embedded Signup ──────────────────────────────────────────────────────

export async function exchangeCodeForToken(
  code: string,
  appId: string,
  appSecret: string,
  redirectUri?: string
): Promise<{ access_token: string; token_type: string }> {
  const url = new URL('https://graph.facebook.com/oauth/access_token')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('code', code)
  // Para o fluxo de popup (Embedded Signup), omite redirect_uri
  if (redirectUri) url.searchParams.set('redirect_uri', redirectUri)

  const response = await fetch(url.toString())
  if (!response.ok) {
    const error = await response.text()
    logger.error({ status: response.status, error }, 'Failed to exchange code for token')
    throw new Error(`Token exchange failed: ${error}`)
  }

  return response.json() as Promise<{ access_token: string; token_type: string }>
}

// ─── Gestão de WABAs e números ────────────────────────────────────────────

export interface WABAPhoneNumber {
  id: string
  display_phone_number: string
  verified_name: string
  status: string
  quality_rating: string
}

export async function getWABAPhoneNumbers(
  wabaId: string,
  accessToken: string
): Promise<WABAPhoneNumber[]> {
  const url = `${GRAPH_API_BASE}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,status,quality_rating`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list phone numbers: ${error}`)
  }

  const data = await response.json() as { data: WABAPhoneNumber[] }
  return data.data ?? []
}

export async function getPhoneNumberInfo(
  phoneNumberId: string,
  accessToken: string
): Promise<{ id: string; display_phone_number: string; verified_name: string; status: string } | null> {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}?fields=id,display_phone_number,verified_name,status`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    if (response.status === 400 || response.status === 404) return null
    const error = await response.text()
    throw new Error(`Failed to get phone number info: ${error}`)
  }

  return response.json() as Promise<{ id: string; display_phone_number: string; verified_name: string; status: string }>
}

export async function subscribeWebhookToWABA(
  wabaId: string,
  accessToken: string
): Promise<void> {
  const url = `${GRAPH_API_BASE}/${wabaId}/subscribed_apps`
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    const error = await response.text()
    logger.warn({ wabaId, error }, 'Failed to subscribe webhook to WABA')
    // Não lança erro — a subscription pode já existir
  }

  logger.info({ wabaId }, 'Webhook subscribed to WABA')
}

// ─── Descobrir WABA/phone via debug_token ─────────────────────────────────

export interface TokenGrantedIds {
  wabaIds: string[]
  phoneNumberIds: string[]
}

/**
 * Usa o endpoint debug_token para extrair os WABA IDs e phone_number_ids
 * que o usuário autorizou no Embedded Signup (granular_scopes).
 */
export async function getGrantedIdsFromToken(
  userAccessToken: string,
  appId: string,
  appSecret: string
): Promise<TokenGrantedIds> {
  const appToken = `${appId}|${appSecret}`
  const url = `${GRAPH_API_BASE}/debug_token?input_token=${encodeURIComponent(userAccessToken)}&access_token=${encodeURIComponent(appToken)}`
  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`debug_token failed: ${error}`)
  }

  const json = await response.json() as {
    data?: {
      granular_scopes?: Array<{ scope: string; target_ids?: string[] }>
    }
  }

  const scopes = json.data?.granular_scopes ?? []
  const wabaIds = scopes.find(s => s.scope === 'whatsapp_business_management')?.target_ids ?? []
  const phoneNumberIds = scopes.find(s => s.scope === 'whatsapp_business_messaging')?.target_ids ?? []

  logger.info({ wabaIds, phoneNumberIds }, 'Granted IDs from token')
  return { wabaIds, phoneNumberIds }
}

// ─── Templates de Mensagem ────────────────────────────────────────────────

export interface MessageTemplate {
  id: string
  name: string
  status: string
  category: string
  language: string
  components: unknown[]
  quality_score?: { score: string }
}

export async function listMessageTemplates(
  wabaId: string,
  accessToken: string
): Promise<MessageTemplate[]> {
  const url = `${GRAPH_API_BASE}/${wabaId}/message_templates?fields=id,name,status,category,language,components,quality_score&limit=50`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list templates: ${error}`)
  }

  const data = await response.json() as { data: MessageTemplate[] }
  return data.data ?? []
}

export async function createMessageTemplate(
  wabaId: string,
  accessToken: string,
  template: {
    name: string
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
    language: string
    components: unknown[]
  }
): Promise<{ id: string; status: string }> {
  const url = `${GRAPH_API_BASE}/${wabaId}/message_templates`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(template)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create template: ${error}`)
  }

  return response.json() as Promise<{ id: string; status: string }>
}

export async function deleteMessageTemplate(
  wabaId: string,
  accessToken: string,
  templateName: string
): Promise<void> {
  const url = `${GRAPH_API_BASE}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete template: ${error}`)
  }
}

// ─── Buscar WABA IDs associados ao token ──────────────────────────────────

export interface WABAInfo {
  id: string
  name: string
  account_review_status?: string
}

export async function getAssociatedWABAs(
  userAccessToken: string
): Promise<WABAInfo[]> {
  // Descobre o user_id primeiro
  const meUrl = `${GRAPH_API_BASE}/me?access_token=${userAccessToken}`
  const meRes = await fetch(meUrl)
  if (!meRes.ok) throw new Error('Failed to get user info from Meta')
  const me = await meRes.json() as { id: string }

  const url = `${GRAPH_API_BASE}/${me.id}/businesses?fields=id,name,account_review_status&access_token=${userAccessToken}`
  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get WABAs: ${error}`)
  }

  const data = await response.json() as { data: WABAInfo[] }
  return data.data ?? []
}
