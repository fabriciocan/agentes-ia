import { prisma } from '../../../../../lib/prisma'
import { getConnectionState } from '../../../../../services/evo-api.service'
import { invalidatePattern } from '../../../../../services/redis.service'

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
      whatsapp_instance_name: true,
      whatsapp_instance_status: true,
      whatsapp_number: true
    }
  })
  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  if (!agent.whatsapp_instance_name) {
    return {
      status: 'disconnected',
      instance_name: null,
      phone: null
    }
  }

  try {
    const state = await getConnectionState(agent.whatsapp_instance_name)
    const evoState = state.instance?.state || 'close'

    // Map EVO states to our states
    let dbStatus: string
    if (evoState === 'open') {
      dbStatus = 'connected'
    } else if (evoState === 'connecting') {
      dbStatus = 'connecting'
    } else {
      dbStatus = 'disconnected'
    }

    // Update DB if status changed
    if (dbStatus !== agent.whatsapp_instance_status) {
      await prisma.agent_configs.update({
        where: { id: agentId },
        data: { whatsapp_instance_status: dbStatus }
      })
      await invalidatePattern(`agent-config:${agentId}`)
      await invalidatePattern(`agent-configs:client:${adminUser.clientId}`)
    }

    return {
      status: dbStatus,
      instance_name: agent.whatsapp_instance_name,
      phone: agent.whatsapp_number
    }
  } catch {
    return {
      status: agent.whatsapp_instance_status,
      instance_name: agent.whatsapp_instance_name,
      phone: agent.whatsapp_number
    }
  }
})
