import { prisma } from '../../lib/prisma'
import { requirePermission } from '../../utils/authorization'
import { createLogger } from '../../utils/logger'

const logger = createLogger('platform:clients')

/**
 * GET /api/platform/clients
 *
 * Lists all clients (platform admin only).
 * Used to populate the client dropdown when creating a new company.
 *
 * Requires: platform.manage_companies permission
 */
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  event.context.user = session.user as typeof event.context.user

  await requirePermission(event, 'platform.manage_companies')

  const clients = await prisma.clients.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' }
  })

  logger.info({ userId: (session.user as { id?: string }).id, count: clients.length }, 'Listed all clients')

  return { clients }
})
