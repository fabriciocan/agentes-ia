/**
 * POST /api/admin/meta/accounts/[id]/unlink-agent
 *
 * Desvincula um agente de uma conta WhatsApp Business (Meta).
 * Limpa todos os campos Meta do agente.
 */
import { prisma } from '../../../../../lib/prisma'
import { invalidatePattern } from '../../../../../services/redis.service'
import { createLogger } from '../../../../../utils/logger'

const logger = createLogger('meta-unlink-agent')

export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const accountId = getRouterParam(event, 'id')
  if (!accountId) {
    throw createError({ statusCode: 400, statusMessage: 'Account ID required' })
  }

  const body = await readBody(event) as { agent_id?: string }
  if (!body.agent_id) {
    throw createError({ statusCode: 400, statusMessage: 'agent_id is required' })
  }

  // Verifica que a conta pertence ao cliente
  const account = await prisma.meta_whatsapp_accounts.findFirst({
    where: { id: accountId, client_id: adminUser.clientId }
  })
  if (!account) {
    throw createError({ statusCode: 404, statusMessage: 'Account not found' })
  }

  // Verifica que o agente pertence ao cliente e está vinculado a esta conta
  const agent = await prisma.agent_configs.findFirst({
    where: { id: body.agent_id, client_id: adminUser.clientId, meta_whatsapp_account_id: accountId }
  })
  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found or not linked to this account' })
  }

  await prisma.agent_configs.update({
    where: { id: body.agent_id },
    data: {
      meta_whatsapp_account_id: null,
      whatsapp_provider: null,
      meta_phone_number_id: null,
      meta_access_token: null,
      meta_waba_id: null
    }
  })

  await invalidatePattern(`agent-config:${body.agent_id}`)
  await invalidatePattern(`agent-configs:client:${adminUser.clientId}`)

  logger.info({ accountId, agentId: body.agent_id }, 'Agent unlinked from Meta account')

  return { success: true }
})
