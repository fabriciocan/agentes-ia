import { prisma } from '../../../../../lib/prisma'
import { createInstance, setWebhook } from '../../../../../services/evo-api.service'
import { invalidatePattern } from '../../../../../services/redis.service'
import { createLogger } from '../../../../../utils/logger'

const logger = createLogger('whatsapp-connect')

export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const agentId = getRouterParam(event, 'id')
  if (!agentId) {
    throw createError({ statusCode: 400, statusMessage: 'Agent ID required' })
  }

  // Verify agent belongs to client
  const agent = await prisma.agent_configs.findFirst({
    where: { id: agentId, client_id: adminUser.clientId },
    select: {
      id: true,
      whatsapp_instance_name: true,
      whatsapp_instance_status: true
    }
  })
  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  // If already has an instance, return error
  if (agent.whatsapp_instance_status === 'connected') {
    throw createError({ statusCode: 409, statusMessage: 'WhatsApp already connected' })
  }

  // Generate deterministic instance name
  const instanceName = `agent-${agentId.slice(0, 8)}`

  try {
    // If there was a previous instance in connecting state, delete it first
    if (agent.whatsapp_instance_name) {
      try {
        const { deleteInstance } = await import('../../../../../services/evo-api.service')
        await deleteInstance(agent.whatsapp_instance_name)
      } catch {
        // Ignore - instance may not exist anymore
      }
    }

    const result = await createInstance(instanceName)

    // Configure webhook to send MESSAGES_UPSERT to N8N
    const config = useRuntimeConfig()
    if (config.n8nWebhookUrl) {
      try {
        await setWebhook(instanceName, config.n8nWebhookUrl)
        logger.info({ instanceName, webhookUrl: config.n8nWebhookUrl }, 'Webhook configured for instance')
      } catch (webhookError) {
        logger.warn({ error: webhookError, instanceName }, 'Failed to set webhook, instance created without webhook')
      }
    }

    // Save instance name and set status to connecting
    await prisma.agent_configs.update({
      where: { id: agentId },
      data: {
        whatsapp_instance_name: instanceName,
        whatsapp_instance_status: 'connecting'
      }
    })

    await invalidatePattern(`agent-config:${agentId}`)
    await invalidatePattern(`agent-configs:client:${adminUser.clientId}`)

    logger.info({ agentId, instanceName }, 'WhatsApp instance created')

    return {
      instance_name: instanceName,
      status: 'connecting',
      qrcode: result.qrcode?.base64 || null
    }
  } catch (error: unknown) {
    logger.error({ error, agentId, instanceName }, 'Failed to create WhatsApp instance')
    const message = error instanceof Error ? error.message : 'Failed to create WhatsApp instance'
    throw createError({ statusCode: 502, statusMessage: message })
  }
})
