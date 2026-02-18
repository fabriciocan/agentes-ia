import { getUsageOverTime } from '../../../services/analytics.service'
import { requirePermission } from '../../../utils/authorization'
import { analyticsQuerySchema } from '../../../utils/validation'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:analytics:usage')

/**
 * GET /api/admin/analytics/usage
 *
 * Get usage over time
 *
 * @query {start_date?, end_date?, granularity?}
 * @returns {usage: UsageOverTime[]}
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
    // Parse and validate query parameters
    const query = getQuery(event)
    const params = analyticsQuerySchema.parse(query)

    // Default to last 30 days if not specified
    const endDate = params.end_date || new Date()
    const startDate = params.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const usage = await getUsageOverTime(
      companyId,
      startDate,
      endDate,
      params.granularity
    )

    return {
      usage,
      period: {
        start: startDate,
        end: endDate,
        granularity: params.granularity
      }
    }
  } catch (error) {
    // If it's already an H3Error, rethrow it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    // If it's a Zod validation error
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        message: 'Validation error',
        data: error
      })
    }

    logger.error({ err: error, companyId }, 'Failed to get usage analytics')
    throw createError({
      statusCode: 500,
      message: 'Failed to get usage analytics'
    })
  }
})
