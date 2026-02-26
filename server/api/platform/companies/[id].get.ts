import { prisma } from '../../../lib/prisma'
import { requirePermission } from '../../../utils/authorization'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('platform:companies:detail')

/**
 * GET /api/platform/companies/:id
 *
 * Returns details of a single company (Platform Admin only)
 */
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  event.context.user = session.user as typeof event.context.user

  await requirePermission(event, 'platform.view_all_companies')

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })
  }

  try {
    const rows = await prisma.$queryRaw<Array<{
      id: string
      name: string
      slug: string
      logo_url: string | null
      status: string | null
      created_at: string
      updated_at: string
      client_id: string
      client_name: string
      client_slug: string
      user_count: string
      agent_count: string
      conversation_count: string
    }>>`
      SELECT
        co.id,
        co.name,
        co.slug,
        co.logo_url,
        co.status,
        co.created_at,
        co.updated_at,
        cl.id as client_id,
        cl.name as client_name,
        cl.slug as client_slug,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT ac.id) as agent_count,
        COUNT(DISTINCT conv.id) as conversation_count
      FROM companies co
      JOIN clients cl ON cl.id = co.client_id
      LEFT JOIN users u ON u.company_id = co.id AND u.deleted_at IS NULL
      LEFT JOIN agent_configs ac ON ac.company_id = co.id
      LEFT JOIN conversations conv ON conv.company_id = co.id
      WHERE co.deleted_at IS NULL AND co.id = ${id}::uuid
      GROUP BY co.id, cl.id, cl.name, cl.slug
    `

    if (!rows.length) {
      throw createError({ statusCode: 404, statusMessage: 'Empresa não encontrada' })
    }

    const row = rows[0]

    // Fetch users
    const users = await prisma.users.findMany({
      where: { company_id: id, deleted_at: null },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        avatar_url: true,
        last_login_at: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    })

    // Fetch agents
    const agents = await prisma.agent_configs.findMany({
      where: { company_id: id },
      select: {
        id: true,
        name: true,
        is_active: true,
        model: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    })

    logger.info({ companyId: id, userId: (session.user as { id?: string }).id }, 'Fetched company detail')

    return {
      company: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        logoUrl: row.logo_url,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        client: {
          id: row.client_id,
          name: row.client_name,
          slug: row.client_slug
        },
        stats: {
          userCount: parseInt(String(row.user_count)),
          agentCount: parseInt(String(row.agent_count)),
          conversationCount: parseInt(String(row.conversation_count))
        }
      },
      users,
      agents
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    logger.error({ error, companyId: id }, 'Failed to fetch company detail')
    throw createError({ statusCode: 500, statusMessage: 'Falha ao buscar empresa' })
  }
})
