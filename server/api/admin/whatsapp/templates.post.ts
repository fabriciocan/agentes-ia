import { prisma } from '../../../lib/prisma'
import { createMessageTemplate } from '../../../services/whatsapp-cloud.service'

/**
 * POST /api/admin/whatsapp/templates
 * Cria um novo template de mensagem no WABA.
 * Body: { agent_id, name, category, language, components }
 */
export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event) as {
    agent_id: string
    name: string
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
    language: string
    components: unknown[]
  }

  if (!body.agent_id || !body.name || !body.category || !body.language || !body.components) {
    throw createError({ statusCode: 400, statusMessage: 'agent_id, name, category, language and components are required' })
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

  const result = await createMessageTemplate(agent.meta_waba_id, agent.meta_access_token, {
    name: body.name,
    category: body.category,
    language: body.language,
    components: body.components
  }).catch((err: Error) => {
    throw createError({ statusCode: 502, statusMessage: err.message })
  })

  return { data: result }
})
