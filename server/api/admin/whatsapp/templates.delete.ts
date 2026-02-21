import { prisma } from '../../../lib/prisma'
import { deleteMessageTemplate } from '../../../services/whatsapp-cloud.service'

/**
 * DELETE /api/admin/whatsapp/templates
 * Exclui um template do WABA.
 * Body: { agent_id, template_name }
 */
export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event) as { agent_id: string; template_name: string }

  if (!body.agent_id || !body.template_name) {
    throw createError({ statusCode: 400, statusMessage: 'agent_id and template_name are required' })
  }

  const agent = await prisma.agent_configs.findFirst({
    where: { id: body.agent_id, client_id: adminUser.clientId },
    select: { meta_waba_id: true, meta_access_token: true, whatsapp_provider: true }
  })

  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  if (agent.whatsapp_provider !== 'meta' || !agent.meta_waba_id || !agent.meta_access_token) {
    throw createError({ statusCode: 400, statusMessage: 'Agent does not have a Meta WhatsApp connection' })
  }

  await deleteMessageTemplate(agent.meta_waba_id, agent.meta_access_token, body.template_name)
    .catch((err: Error) => {
      throw createError({ statusCode: 502, statusMessage: err.message })
    })

  return { success: true }
})
