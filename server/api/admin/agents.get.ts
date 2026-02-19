import { getAgentConfigsByCompany, getAgentConfigsByClient } from '../../services/agent-config.service'
import { requirePermission } from '../../utils/authorization'
import { prisma } from '../../lib/prisma'

/**
 * GET /api/admin/agents
 *
 * Lists agents scoped to the current user's company.
 * Platform admins (wildcard '*' permission) can see all agents, optionally filtered by company.
 *
 * Query params:
 *   - company_id: (platform admin only) filter by specific company
 */
export default defineEventHandler(async (event) => {
  requirePermission(event, 'agents.read')

  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const permissions = event.context.permissions || []
  const isPlatformAdmin = permissions.includes('*')

  // Platform admin: can see all agents or filter by company
  if (isPlatformAdmin) {
    const query = getQuery(event)
    const filterCompanyId = query.company_id as string | undefined

    const agents = await prisma.agent_configs.findMany({
      where: filterCompanyId ? { company_id: filterCompanyId } : {},
      include: {
        companies: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { created_at: 'desc' }
    })

    return { data: agents }
  }

  // Company user: only see their company's agents
  const companyId = user.company_id
  if (!companyId) {
    // Legacy user: fall back to client-scoped agents
    const adminUser = event.context.adminUser as unknown as { clientId?: string }
    if (adminUser?.clientId) {
      const configs = await getAgentConfigsByClient(adminUser.clientId)
      return { data: configs }
    }
    throw createError({ statusCode: 403, statusMessage: 'No company associated with user' })
  }

  const configs = await getAgentConfigsByCompany(companyId)
  return { data: configs }
})
