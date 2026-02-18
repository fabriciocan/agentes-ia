import { createLogger } from '../utils/logger'

const logger = createLogger('evo-api')

function getConfig() {
  const config = useRuntimeConfig()
  if (!config.evoApiUrl || !config.evoApiKey) {
    throw new Error('EVO API URL and Key must be configured')
  }
  return { url: config.evoApiUrl.replace(/\/$/, ''), key: config.evoApiKey }
}

async function evoFetch<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const { url, key } = getConfig()
  const response = await $fetch<T>(`${url}${path}`, {
    method: (options.method || 'GET') as 'GET' | 'POST' | 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      apikey: key
    },
    body: options.body ? options.body : undefined
  })
  return response as T
}

export interface EvoCreateInstanceResponse {
  instance: { instanceName: string; status: string }
  hash: { apikey: string }
  qrcode?: { code: string; base64: string }
}

export interface EvoConnectionState {
  instance: { instanceName: string; state: string }
}

export interface EvoQrCodeResponse {
  pairingCode: string | null
  code: string
  base64: string
}

export async function createInstance(instanceName: string): Promise<EvoCreateInstanceResponse> {
  logger.info({ instanceName }, 'Creating EVO API instance')
  return evoFetch<EvoCreateInstanceResponse>('/instance/create', {
    method: 'POST',
    body: {
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true
    }
  })
}

export async function getQrCode(instanceName: string): Promise<EvoQrCodeResponse> {
  logger.debug({ instanceName }, 'Fetching QR code')
  return evoFetch<EvoQrCodeResponse>(`/instance/connect/${instanceName}`)
}

export async function getConnectionState(instanceName: string): Promise<EvoConnectionState> {
  return evoFetch<EvoConnectionState>(`/instance/connectionState/${instanceName}`)
}

export async function deleteInstance(instanceName: string): Promise<void> {
  logger.info({ instanceName }, 'Deleting EVO API instance')
  await evoFetch(`/instance/delete/${instanceName}`, { method: 'DELETE' })
}

export async function logoutInstance(instanceName: string): Promise<void> {
  logger.info({ instanceName }, 'Logging out EVO API instance')
  await evoFetch(`/instance/logout/${instanceName}`, { method: 'DELETE' })
}

export async function setWebhook(instanceName: string, webhookUrl: string): Promise<void> {
  logger.info({ instanceName, webhookUrl }, 'Setting webhook for EVO API instance')
  await evoFetch(`/webhook/set/${instanceName}`, {
    method: 'POST',
    body: {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: false,
        events: [
          'MESSAGES_UPSERT'
        ]
      }
    }
  })
}
