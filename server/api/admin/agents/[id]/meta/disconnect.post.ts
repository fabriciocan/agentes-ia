import { prisma } from '../../../../../lib/prisma'
import { invalidatePattern } from '../../../../../services/redis.service'
import { createLogger } from '../../../../../utils/logger'

const logger = createLogger('meta-disconnect')

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
    select: { id: true, meta_phone_number_id: true, whatsapp_provider: true }
  })

  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  if (agent.whatsapp_provider !== 'meta' || !agent.meta_phone_number_id) {
    throw createError({ statusCode: 400, statusMessage: 'Meta WhatsApp is not connected to this agent' })
  }

  // Remove os campos Meta do agente
  await prisma.agent_configs.update({
    where: { id: agentId },
    data: {
      whatsapp_provider: null,
      meta_phone_number_id: null,
      meta_access_token: null,
      meta_waba_id: null
    }
  })

  await invalidatePattern(`agent-config:${agentId}`)
  await invalidatePattern(`agent-configs:client:${adminUser.clientId}`)

  logger.info({ agentId }, 'Meta WhatsApp disconnected')

  return { status: 'disconnected' }
})
