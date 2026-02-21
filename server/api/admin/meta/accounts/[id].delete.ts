/**
 * DELETE /api/admin/meta/accounts/[id]
 * Remove uma conta WhatsApp Business e desvincula de todos os agentes.
 */
import { prisma } from '../../../../lib/prisma'

export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const accountId = getRouterParam(event, 'id')
  if (!accountId) {
    throw createError({ statusCode: 400, statusMessage: 'Account ID required' })
  }

  const account = await prisma.meta_whatsapp_accounts.findFirst({
    where: { id: accountId, client_id: adminUser.clientId }
  })

  if (!account) {
    throw createError({ statusCode: 404, statusMessage: 'Account not found' })
  }

  await prisma.meta_whatsapp_accounts.delete({ where: { id: accountId } })

  return { success: true }
})
