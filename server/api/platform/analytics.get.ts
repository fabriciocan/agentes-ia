import { prisma } from '../../lib/prisma'
import { requirePermission } from '../../utils/authorization'
import { createLogger } from '../../utils/logger'

const logger = createLogger('platform:analytics')

/**
 * GET /api/platform/analytics
 *
 * Get platform-wide analytics (Platform Admin only)
 */
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  // Add user to event context for authorization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event.context.user = session.user as any

  // Require platform admin permission
  await requirePermission(event, 'platform.analytics')

  try {
    // Get aggregated stats
    const statsRows = await prisma.$queryRaw<Array<{
      total_companies: string
      total_users: string
      total_agents: string
      total_conversations: string
      total_messages: string
    }>>`
      SELECT
        COUNT(DISTINCT co.id) as total_companies,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT ac.id) as total_agents,
        COUNT(DISTINCT conv.id) as total_conversations,
        COUNT(DISTINCT m.id) as total_messages
      FROM companies co
      LEFT JOIN users u ON u.company_id = co.id AND u.deleted_at IS NULL
      LEFT JOIN agent_configs ac ON ac.company_id = co.id
      LEFT JOIN conversations conv ON conv.company_id = co.id
      LEFT JOIN messages m ON m.conversation_id = conv.id
      WHERE co.deleted_at IS NULL
    `

    const stats = statsRows[0] || {}

    // Get companies by status
    const statusRows = await prisma.$queryRaw<Array<{
      status: string
      count: string
    }>>`
      SELECT status, COUNT(*) as count
      FROM companies
      WHERE deleted_at IS NULL
      GROUP BY status
    `

    // Get recent activity
    const activityRows = await prisma.$queryRaw<Array<{
      company_name: string
      conversations_today: string
      messages_today: string
    }>>`
      SELECT
        co.name as company_name,
        COUNT(DISTINCT conv.id) as conversations_today,
        COUNT(DISTINCT m.id) as messages_today
      FROM companies co
      LEFT JOIN conversations conv ON conv.company_id = co.id
        AND conv.created_at >= CURRENT_DATE
      LEFT JOIN messages m ON m.conversation_id = conv.id
        AND m.created_at >= CURRENT_DATE
      WHERE co.deleted_at IS NULL
      GROUP BY co.id, co.name
      ORDER BY messages_today DESC
      LIMIT 10
    `

    logger.info({ userId: (session.user as { id?: string }).id }, 'Retrieved platform analytics')

    return {
      stats: {
        totalCompanies: parseInt(String(stats.total_companies || 0)),
        totalUsers: parseInt(String(stats.total_users || 0)),
        totalAgents: parseInt(String(stats.total_agents || 0)),
        totalConversations: parseInt(String(stats.total_conversations || 0)),
        totalMessages: parseInt(String(stats.total_messages || 0))
      },
      companiesByStatus: statusRows.map(row => ({
        status: row.status,
        count: parseInt(String(row.count))
      })),
      recentActivity: activityRows.map(row => ({
        companyName: row.company_name,
        conversationsToday: parseInt(String(row.conversations_today)),
        messagesToday: parseInt(String(row.messages_today))
      }))
    }
  } catch (error) {
    logger.error({ error, userId: (session.user as { id?: string }).id }, 'Failed to get platform analytics')
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch analytics'
    })
  }
})
