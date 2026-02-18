import { prisma } from '../../../../../lib/prisma'
import { deleteInstance, logoutInstance } from '../../../../../services/evo-api.service'
import { invalidatePattern } from '../../../../../services/redis.service'
import { createLogger } from '../../../../../utils/logger'

const logger = createLogger('whatsapp-disconnect')

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
    select: { id: true, whatsapp_instance_name: true }
  })
  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  if (agent.whatsapp_instance_name) {
    try {
      await logoutInstance(agent.whatsapp_instance_name)
    } catch {
      // Ignore logout errors
    }
    try {
      await deleteInstance(agent.whatsapp_instance_name)
    } catch {
      // Ignore delete errors - instance may already be gone
    }
  }

  // Clear WhatsApp fields
  await prisma.agent_configs.update({
    where: { id: agentId },
    data: {
      whatsapp_instance_name: null,
      whatsapp_instance_status: 'disconnected',
      whatsapp_number: null
    }
  })

  await invalidatePattern(`agent-config:${agentId}`)
  await invalidatePattern(`agent-configs:client:${adminUser.clientId}`)

  logger.info({ agentId, instanceName: agent.whatsapp_instance_name }, 'WhatsApp disconnected')

  return { status: 'disconnected' }
})
