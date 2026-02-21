import { prisma } from '../../../lib/prisma'

/**
 * GET /api/admin/whatsapp/connections
 * Lista todos os agentes com conexão Meta (oficial) configurada.
 */
export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const agents = await prisma.agent_configs.findMany({
    where: {
      client_id: adminUser.clientId,
      is_active: true
    },
    select: {
      id: true,
      name: true,
      whatsapp_provider: true,
      meta_phone_number_id: true,
      meta_waba_id: true,
      // Omite meta_access_token por segurança
      whatsapp_instance_name: true,
      whatsapp_instance_status: true,
      whatsapp_number: true
    },
    orderBy: { name: 'asc' }
  })

  return { data: agents }
})
