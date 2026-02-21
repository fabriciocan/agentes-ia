import { prisma } from '../../../../../lib/prisma'
import { getPhoneNumberInfo } from '../../../../../services/whatsapp-cloud.service'
import { createLogger } from '../../../../../utils/logger'

const logger = createLogger('meta-status')

export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const agentId = getRouterParam(event, 'id')
  if (!agentId) {
    throw createError({ statusCode: 400, statusMessage: 'Agent ID required' })
  }

  const agent = await prisma.agent_configs.findFirst({
    where: { id: agentId, client_id: adminUser.clientId },
    select: {
      id: true,
      whatsapp_provider: true,
      meta_phone_number_id: true,
      meta_access_token: true,
      meta_waba_id: true
    }
  })

  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  if (agent.whatsapp_provider !== 'meta' || !agent.meta_phone_number_id || !agent.meta_access_token) {
    return {
      status: 'disconnected',
      phone_number_id: null,
      display_phone_number: null,
      verified_name: null,
      waba_id: null
    }
  }

  try {
    const info = await getPhoneNumberInfo(agent.meta_phone_number_id, agent.meta_access_token)

    if (!info) {
      return {
        status: 'error',
        phone_number_id: agent.meta_phone_number_id,
        display_phone_number: null,
        verified_name: null,
        waba_id: agent.meta_waba_id,
        error: 'Phone number not found or token expired'
      }
    }

    return {
      status: 'connected',
      phone_number_id: info.id,
      display_phone_number: info.display_phone_number,
      verified_name: info.verified_name,
      waba_id: agent.meta_waba_id
    }
  } catch (error) {
    logger.error({ error, agentId }, 'Failed to fetch Meta phone number status')
    return {
      status: 'error',
      phone_number_id: agent.meta_phone_number_id,
      display_phone_number: null,
      verified_name: null,
      waba_id: agent.meta_waba_id,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})
