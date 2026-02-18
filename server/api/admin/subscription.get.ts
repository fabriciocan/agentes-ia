import { getCurrentSubscription } from '../../services/subscription.service'
import { requirePermission } from '../../utils/authorization'
import { createLogger } from '../../utils/logger'

const logger = createLogger('api:admin:subscription:get')

/**
 * GET /api/admin/subscription
 *
 * Get current subscription details
 *
 * @returns {subscription: SubscriptionWithPlan}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  requirePermission(event, 'billing.read')

  const companyId = event.context.user?.company_id

  if (!companyId) {
    throw createError({
      statusCode: 403,
      message: 'No company associated with user'
    })
  }

  try {
    const subscription = await getCurrentSubscription(companyId)

    if (!subscription) {
      throw createError({
        statusCode: 404,
        message: 'No subscription found'
      })
    }

    return { subscription }
  } catch (error) {
    // If it's already an H3Error, rethrow it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    logger.error({ err: error, companyId }, 'Failed to get subscription')
    throw createError({
      statusCode: 500,
      message: 'Failed to get subscription'
    })
  }
})
