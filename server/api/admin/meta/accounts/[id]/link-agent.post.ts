/**
 * POST /api/admin/meta/accounts/[id]/link-agent
 *
 * Vincula um agente a uma conta WhatsApp Business (Meta).
 * Copia as credenciais da conta para os campos do agente e define whatsapp_provider = 'meta'.
 */
import { prisma } from '../../../../../lib/prisma'
import { invalidatePattern } from '../../../../../services/redis.service'
import { createLogger } from '../../../../../utils/logger'

const logger = createLogger('meta-link-agent')

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

  // Verifica que o agente pertence ao cliente
  const agent = await prisma.agent_configs.findFirst({
    where: { id: body.agent_id, client_id: adminUser.clientId },
    select: { id: true, meta_whatsapp_account_id: true, meta_phone_number_id: true }
  })
  if (!agent) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  // Verifica se outro agente já está vinculado a este número
  const conflict = await prisma.agent_configs.findFirst({
    where: {
      meta_phone_number_id: account.phone_number_id,
      id: { not: body.agent_id }
    },
    select: { id: true, name: true }
  })
  if (conflict) {
    throw createError({
      statusCode: 409,
      statusMessage: `Número já vinculado ao agente "${conflict.name}"`
    })
  }

  // Vincula o agente à conta e copia as credenciais
  await prisma.agent_configs.update({
    where: { id: body.agent_id },
    data: {
      meta_whatsapp_account_id: account.id,
      whatsapp_provider: 'meta',
      meta_phone_number_id: account.phone_number_id,
      meta_access_token: account.access_token,
      meta_waba_id: account.waba_id
    }
  })

  await invalidatePattern(`agent-config:${body.agent_id}`)
  await invalidatePattern(`agent-configs:client:${adminUser.clientId}`)

  logger.info({ accountId, agentId: body.agent_id }, 'Agent linked to Meta account')

  return { success: true, agent_id: body.agent_id }
})
