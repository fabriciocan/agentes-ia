import { getAvailablePlans } from '../../../services/subscription.service'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:subscription:plans')

/**
 * GET /api/admin/subscription/plans
 *
 * Get all available subscription plans
 *
 * @returns {plans: SubscriptionPlan[]}
 */
export default defineEventHandler(async (event) => {
  try {
    const plans = await getAvailablePlans()

    return { plans }
  } catch (error) {
    logger.error({ err: error }, 'Failed to get subscription plans')
    throw createError({
      statusCode: 500,
      message: 'Failed to get subscription plans'
    })
  }
})
