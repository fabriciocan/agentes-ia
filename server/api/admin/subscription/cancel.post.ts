import { cancelSubscription, getCurrentSubscription } from '../../../services/subscription.service'
import { logAuditFromEvent, AuditActions } from '../../../services/audit.service'
import { requirePermission } from '../../../utils/authorization'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:subscription:cancel')

/**
 * POST /api/admin/subscription/cancel
 *
 * Cancel subscription (at end of current period)
 *
 * @returns {success: boolean, expires_at: Date}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  requirePermission(event, 'billing.manage')

  const companyId = event.context.user?.company_id

  if (!companyId) {
    throw createError({
      statusCode: 403,
      message: 'No company associated with user'
    })
  }

  try {
    // Get current subscription for audit
    const subscription = await getCurrentSubscription(companyId)

    if (!subscription) {
      throw createError({
        statusCode: 404,
        message: 'No active subscription found'
      })
    }

    // Cancel subscription
    await cancelSubscription(companyId)

    // Log audit event
    await logAuditFromEvent(
      event,
      AuditActions.SUBSCRIPTION_CANCELLED,
      'subscription',
      subscription.id,
      {
        old: {
          status: subscription.status,
          plan: subscription.plan.slug
        }
      }
    )

    logger.info(
      {
        companyId,
        plan: subscription.plan.slug,
        expiresAt: subscription.current_period_end
      },
      'Subscription cancelled'
    )

    return {
      success: true,
      expires_at: subscription.current_period_end
    }
  } catch (error) {
    // If it's already an H3Error, rethrow it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    logger.error({ err: error, companyId }, 'Failed to cancel subscription')
    throw createError({
      statusCode: 500,
      message: 'Failed to cancel subscription'
    })
  }
})
