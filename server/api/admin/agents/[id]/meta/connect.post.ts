import { prisma } from '../../../../../lib/prisma'
import {
  exchangeCodeForToken,
  getWABAPhoneNumbers,
  subscribeWebhookToWABA,
  getPhoneNumberInfo,
  getGrantedIdsFromToken
} from '../../../../../services/whatsapp-cloud.service'
import { invalidatePattern } from '../../../../../services/redis.service'
import { createLogger } from '../../../../../utils/logger'

const logger = createLogger('meta-connect')

export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const agentId = getRouterParam(event, 'id')
  if (!agentId) {
    throw createError({ statusCode: 400, statusMessage: 'Agent ID required' })
  }

  const config = useRuntimeConfig()

  // Verifica configuração do Meta App
  if (!config.public.metaAppId || !config.metaAppSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Meta App not configured. Set NUXT_PUBLIC_META_APP_ID and NUXT_META_APP_SECRET.' })
  }

  // Verifica que o agente pertence ao cliente
  const agent = await prisma.agent_configs.findFirst({
    where: { id: agentId, client_id: adminUser.clientId },
    select: {
      id: true,
      whatsapp_provider: true,
      meta_phone_number_id: true
    }
  })

  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  if (agent.whatsapp_provider === 'meta' && agent.meta_phone_number_id) {
    throw createError({ statusCode: 409, statusMessage: 'Meta WhatsApp already connected to this agent' })
  }

  const body = await readBody(event) as {
    code?: string              // vem do Embedded Signup
    access_token?: string      // token manual (fallback)
    phone_number_id?: string
    waba_id?: string
  }

  let accessToken: string
  let phoneNumberId: string
  let wabaId: string

  if (body.code) {
    // Para Embedded Signup (popup), omite redirect_uri na troca de code.
    const tokenData = await exchangeCodeForToken(
      body.code,
      config.public.metaAppId,
      config.metaAppSecret
    ).catch((err: Error) => {
      logger.error({ err }, 'Failed to exchange code for token')
      throw createError({ statusCode: 502, statusMessage: `Failed to exchange code: ${err.message}` })
    })

    accessToken = tokenData.access_token

    // Se o frontend não capturou o waba_id (ex: fluxo "já conectado"),
    // descobrimos via debug_token (granular_scopes)
    if (body.waba_id) {
      wabaId = body.waba_id
    } else {
      const granted = await getGrantedIdsFromToken(accessToken, config.public.metaAppId, config.metaAppSecret)
        .catch((err: Error) => {
          throw createError({ statusCode: 502, statusMessage: `Failed to discover WABA from token: ${err.message}` })
        })
      if (!granted.wabaIds.length) {
        throw createError({ statusCode: 422, statusMessage: 'No WABA found in this token. Complete the Embedded Signup again.' })
      }
      wabaId = granted.wabaIds[0]

      // Se o phone_number_id também não veio, pega o primeiro do granular_scopes
      if (!body.phone_number_id && granted.phoneNumberIds.length) {
        phoneNumberId = granted.phoneNumberIds[0]
      }
    }

    // Pega o primeiro número do WABA, ou usa o informado
    if (!phoneNumberId) {
      if (body.phone_number_id) {
        phoneNumberId = body.phone_number_id
      } else {
        const numbers = await getWABAPhoneNumbers(wabaId, accessToken)
          .catch((err: Error) => {
            throw createError({ statusCode: 502, statusMessage: `Failed to list phone numbers: ${err.message}` })
          })
        if (!numbers.length) {
          throw createError({ statusCode: 422, statusMessage: 'No phone numbers found in this WABA' })
        }
        phoneNumberId = numbers[0].id
      }
    }
  } else if (body.access_token && body.phone_number_id && body.waba_id) {
    // Conexão manual via token
    accessToken = body.access_token
    phoneNumberId = body.phone_number_id
    wabaId = body.waba_id
  } else {
    throw createError({
      statusCode: 400,
      statusMessage: 'Provide either { code, waba_id } (Embedded Signup) or { access_token, phone_number_id, waba_id } (manual)'
    })
  }

  // Valida o phone number
  const phoneInfo = await getPhoneNumberInfo(phoneNumberId, accessToken).catch(() => null)
  if (!phoneInfo) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid phone_number_id or access_token — could not fetch phone info from Meta' })
  }

  // Verifica se outro agente já usa este phone_number_id
  const existingAgent = await prisma.agent_configs.findFirst({
    where: {
      meta_phone_number_id: phoneNumberId,
      id: { not: agentId }
    },
    select: { id: true, name: true }
  })
  if (existingAgent) {
    throw createError({
      statusCode: 409,
      statusMessage: `Phone number already connected to agent "${existingAgent.name}" (${existingAgent.id})`
    })
  }

  // Subscreve webhook ao WABA
  await subscribeWebhookToWABA(wabaId, accessToken).catch(err =>
    logger.warn({ err, wabaId }, 'Failed to subscribe webhook — continuing anyway')
  )

  // Salva no banco
  await prisma.agent_configs.update({
    where: { id: agentId },
    data: {
      whatsapp_provider: 'meta',
      meta_phone_number_id: phoneNumberId,
      meta_access_token: accessToken,
      meta_waba_id: wabaId
    }
  })

  await invalidatePattern(`agent-config:${agentId}`)
  await invalidatePattern(`agent-configs:client:${adminUser.clientId}`)

  logger.info({ agentId, phoneNumberId, wabaId }, 'Meta WhatsApp connected')

  return {
    status: 'connected',
    phone_number_id: phoneNumberId,
    waba_id: wabaId,
    display_phone_number: phoneInfo.display_phone_number,
    verified_name: phoneInfo.verified_name
  }
})
