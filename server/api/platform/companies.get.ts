import { prisma } from '../../lib/prisma'
import { requirePermission } from '../../utils/authorization'
import { createLogger } from '../../utils/logger'

const logger = createLogger('platform:companies')

/**
 * GET /api/platform/companies
 *
 * List all companies in the platform (Platform Admin only)
 */
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  // Add user to event context for authorization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event.context.user = session.user as any

  // Require platform admin permission
  await requirePermission(event, 'platform.view_all_companies')

  try {
    // Complex aggregation query with multiple JOINs - use $queryRaw
    const rows = await prisma.$queryRaw<Array<{
      id: string
      name: string
      slug: string
      logo_url: string | null
      status: string | null
      created_at: string
      updated_at: string
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
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT ac.id) as agent_count,
        COUNT(DISTINCT conv.id) as conversation_count
      FROM companies co
      LEFT JOIN users u ON u.company_id = co.id AND u.deleted_at IS NULL
      LEFT JOIN agent_configs ac ON ac.company_id = co.id
      LEFT JOIN conversations conv ON conv.company_id = co.id
      WHERE co.deleted_at IS NULL
      GROUP BY co.id
      ORDER BY co.created_at DESC
    `

    logger.info({ userId: (session.user as { id?: string }).id, count: rows.length }, 'Listed all companies')

    return {
      companies: rows.map(row => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        logoUrl: row.logo_url,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        stats: {
          userCount: parseInt(String(row.user_count)),
          agentCount: parseInt(String(row.agent_count)),
          conversationCount: parseInt(String(row.conversation_count))
        }
      }))
    }
  } catch (error) {
    logger.error({ error, userId: (session.user as { id?: string }).id }, 'Failed to list companies')
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch companies'
    })
  }
})
