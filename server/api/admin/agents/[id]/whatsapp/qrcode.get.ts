import { prisma } from '../../../../../lib/prisma'
import { getQrCode } from '../../../../../services/evo-api.service'

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
      whatsapp_instance_status: true
    }
  })
  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  if (!agent.whatsapp_instance_name) {
    throw createError({ statusCode: 400, statusMessage: 'No WhatsApp instance. Connect first.' })
  }

  try {
    const result = await getQrCode(agent.whatsapp_instance_name)
    return {
      base64: result.base64,
      code: result.code
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get QR code'
    throw createError({ statusCode: 502, statusMessage: message })
  }
})
