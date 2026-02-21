/**
 * GET /api/admin/meta/accounts
 * Lista todas as contas WhatsApp Business conectadas do cliente.
 */
import { prisma } from '../../../../lib/prisma'

export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const accounts = await prisma.meta_whatsapp_accounts.findMany({
    where: { client_id: adminUser.clientId },
    select: {
      id: true,
      phone_number_id: true,
      waba_id: true,
      display_phone_number: true,
      verified_name: true,
      status: true,
      created_at: true,
      // Agentes vinculados a esta conta
      agent_configs: {
        select: { id: true, name: true }
      }
    },
    orderBy: { created_at: 'desc' }
  })

  return { data: accounts }
})
