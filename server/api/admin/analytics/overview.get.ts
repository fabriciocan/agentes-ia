import {
  getDashboardStats,
  getConversationMetrics,
  getTopAgents
} from '../../../services/analytics.service'
import { requirePermission } from '../../../utils/authorization'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:analytics:overview')

/**
 * GET /api/admin/analytics/overview
 *
 * Get dashboard overview analytics
 *
 * @returns {stats, conversation_metrics, top_agents}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  requirePermission(event, 'analytics.read')

  const companyId = event.context.user?.company_id

  if (!companyId) {
    throw createError({
      statusCode: 403,
      message: 'No company associated with user'
    })
  }

  try {
    const [stats, conversationMetrics, topAgents] = await Promise.all([
      getDashboardStats(companyId),
      getConversationMetrics(companyId),
      getTopAgents(companyId, 5)
    ])

    return {
      stats,
      conversation_metrics: conversationMetrics,
      top_agents: topAgents
    }
  } catch (error) {
    logger.error({ err: error, companyId }, 'Failed to get analytics overview')
    throw createError({
      statusCode: 500,
      message: 'Failed to get analytics overview'
    })
  }
})
