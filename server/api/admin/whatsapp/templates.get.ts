import { prisma } from '../../../lib/prisma'
import { listMessageTemplates } from '../../../services/whatsapp-cloud.service'

/**
 * GET /api/admin/whatsapp/templates?agent_id=xxx
 * Lista templates de mensagem do WABA associado ao agente.
 */
export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const query = getQuery(event)
  const agentId = query.agent_id as string | undefined

  if (!agentId) {
    throw createError({ statusCode: 400, statusMessage: 'agent_id query param required' })
  }

  const agent = await prisma.agent_configs.findFirst({
    where: { id: agentId, client_id: adminUser.clientId },
    select: { meta_waba_id: true, meta_access_token: true, whatsapp_provider: true }
  })

  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  if (agent.whatsapp_provider !== 'meta' || !agent.meta_waba_id || !agent.meta_access_token) {
    throw createError({ statusCode: 400, statusMessage: 'Agent does not have a Meta WhatsApp connection' })
  }

  const templates = await listMessageTemplates(agent.meta_waba_id, agent.meta_access_token)
    .catch((err: Error) => {
      throw createError({ statusCode: 502, statusMessage: err.message })
    })

  return { data: templates }
})
