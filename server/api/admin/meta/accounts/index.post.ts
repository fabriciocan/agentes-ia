/**
 * POST /api/admin/meta/accounts
 *
 * Conecta uma conta WhatsApp Business via Embedded Signup (OAuth manual).
 * Recebe o `code` retornado pelo Facebook OAuth redirect, troca pelo access_token
 * passando o mesmo `redirect_uri` usado na abertura do popup, e salva as
 * credenciais sem vincular a nenhum agente ainda.
 */
import { prisma } from '../../../../lib/prisma'
import {
  exchangeCodeForToken,
  getWABAPhoneNumbers,
  subscribeWebhookToWABA,
  getPhoneNumberInfo,
  getGrantedIdsFromToken
} from '../../../../services/whatsapp-cloud.service'
import { createLogger } from '../../../../utils/logger'

const logger = createLogger('meta-accounts')

export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const config = useRuntimeConfig()

  if (!config.public.metaAppId || !config.metaAppSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Meta App not configured' })
  }

  const body = await readBody(event) as {
    code?: string
    redirect_uri?: string
    waba_id?: string
    phone_number_id?: string
  }

  if (!body.code) {
    throw createError({ statusCode: 400, statusMessage: 'code is required' })
  }

  // Exchange the OAuth code for a user access token.
  // The redirect_uri MUST match the one used when opening the popup.
  const tokenData = await exchangeCodeForToken(
    body.code,
    config.public.metaAppId as string,
    config.metaAppSecret as string,
    body.redirect_uri
  ).catch((err: Error) => {
    logger.error({ err }, 'Failed to exchange code for token')
    throw createError({ statusCode: 502, statusMessage: `Falha ao trocar code por token: ${err.message}` })
  })

  const accessToken = tokenData.access_token

  // Resolve waba_id: use the one from body (postMessage) or discover via debug_token
  let wabaId: string
  if (body.waba_id) {
    wabaId = body.waba_id
  } else {
    const granted = await getGrantedIdsFromToken(accessToken, config.public.metaAppId as string, config.metaAppSecret as string)
      .catch((err: Error) => {
        throw createError({ statusCode: 502, statusMessage: `Falha ao descobrir WABA: ${err.message}` })
      })
    if (!granted.wabaIds.length) {
      throw createError({ statusCode: 422, statusMessage: 'Nenhum WABA encontrado no token. Refaça o Embedded Signup.' })
    }
    wabaId = granted.wabaIds[0]!
  }

  // Resolve phone_number_id
  let phoneNumberId: string
  if (body.phone_number_id) {
    phoneNumberId = body.phone_number_id
  } else {
    const numbers = await getWABAPhoneNumbers(wabaId, accessToken)
      .catch((err: Error) => {
        throw createError({ statusCode: 502, statusMessage: `Falha ao listar números: ${err.message}` })
      })
    if (!numbers.length) {
      throw createError({ statusCode: 422, statusMessage: 'Nenhum número encontrado neste WABA' })
    }
    phoneNumberId = numbers[0]!.id
  }

  // Validate the phone number on Meta's side
  const phoneInfo = await getPhoneNumberInfo(phoneNumberId, accessToken).catch(() => null)
  if (!phoneInfo) {
    throw createError({ statusCode: 422, statusMessage: 'Número inválido ou token sem permissão' })
  }

  // Upsert the account for this client
  const existing = await prisma.meta_whatsapp_accounts.findFirst({
    where: { phone_number_id: phoneNumberId, client_id: adminUser.clientId }
  })

  let account
  if (existing) {
    // Re-connection: update credentials
    account = await prisma.meta_whatsapp_accounts.update({
      where: { id: existing.id },
      data: {
        access_token: accessToken,
        waba_id: wabaId,
        display_phone_number: phoneInfo.display_phone_number,
        verified_name: phoneInfo.verified_name,
        status: 'connected',
        updated_at: new Date()
      }
    })
  } else {
    // Check if another client already owns this number
    const otherClient = await prisma.meta_whatsapp_accounts.findFirst({
      where: { phone_number_id: phoneNumberId }
    })
    if (otherClient) {
      throw createError({ statusCode: 409, statusMessage: 'Este número já está conectado em outra conta' })
    }

    account = await prisma.meta_whatsapp_accounts.create({
      data: {
        client_id: adminUser.clientId,
        phone_number_id: phoneNumberId,
        waba_id: wabaId,
        access_token: accessToken,
        display_phone_number: phoneInfo.display_phone_number,
        verified_name: phoneInfo.verified_name,
        status: 'connected'
      }
    })
  }

  // Subscribe webhook to WABA (best-effort — may already be subscribed)
  await subscribeWebhookToWABA(wabaId, accessToken).catch(err =>
    logger.warn({ err, wabaId }, 'Failed to subscribe webhook')
  )

  logger.info({ accountId: account.id, phoneNumberId, wabaId }, 'Meta WhatsApp account connected')

  return {
    id: account.id,
    phone_number_id: phoneNumberId,
    waba_id: wabaId,
    display_phone_number: phoneInfo.display_phone_number,
    verified_name: phoneInfo.verified_name,
    status: 'connected'
  }
})
